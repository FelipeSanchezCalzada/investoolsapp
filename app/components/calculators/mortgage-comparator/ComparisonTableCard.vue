<script setup lang="ts">
import { ArrowDown, ArrowUp, Trophy, TriangleAlert } from '@lucide/vue'
import {
  FlexRender,
  getCoreRowModel,
  getSortedRowModel,
  useVueTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/vue-table'
import type { MortgageResult } from '~/lib/mortgage/calculate'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatPercent } from '~/composables/useMortgageComparator'

const { comparison } = useMortgageComparator()
const { t } = useI18n()

const enabledResults = computed(() =>
  (comparison.value?.results ?? []).filter(result => result.mortgage.enabled),
)

function rankOf(result: MortgageResult): number | null {
  return comparison.value?.rankByApr[result.mortgage.id] ?? null
}

function netWorthRankOf(result: MortgageResult): number | null {
  return comparison.value?.rankByNetWorth[result.mortgage.id] ?? null
}

/** Numeric column: sorts on the raw value and prints the formatted one. */
function numericColumn(
  id: string,
  header: string,
  value: (result: MortgageResult) => number | null,
  format: (result: MortgageResult) => string,
  hint?: string,
): ColumnDef<MortgageResult> {
  return {
    id,
    accessorFn: result => value(result),
    header,
    meta: { hint },
    sortUndefined: 'last',
    cell: ({ row }) => format(row.original),
  }
}

const nameColumn = computed<ColumnDef<MortgageResult>>(() => ({
  id: 'name',
  accessorFn: result => result.mortgage.name,
  header: t('mortgage.comparisonTable.mortgage'),
  enableSorting: false,
  cell: ({ row }) => {
    const result = row.original
    const rank = rankOf(result)
    const netWorthRank = netWorthRankOf(result)
    const captions: string[] = []
    if (rank) captions.push(t('mortgage.comparisonTable.captionApr', { rank }))
    if (netWorthRank) captions.push(t('mortgage.comparisonTable.captionNetWorth', { rank: netWorthRank }))
    if (!result.viable) captions.push(t('mortgage.comparisonTable.captionNotViable'))

    return h('div', { class: 'flex items-center gap-2' }, [
      h('span', {
        class: 'size-2.5 shrink-0 rounded-full',
        style: { backgroundColor: result.mortgage.color },
      }),
      h('div', [
        h('p', { class: 'whitespace-nowrap' }, result.mortgage.name),
        h('p', { class: 'text-xs text-muted-foreground' }, captions.join(' · ')),
      ]),
      result.warnings.length
        ? h(TriangleAlert, { class: 'size-4 shrink-0 text-amber-500' })
        : null,
    ])
  },
}))

const columns = computed<ColumnDef<MortgageResult>[]>(() => [
  nameColumn.value,
  numericColumn('initialInstallment', t('mortgage.comparisonTable.initialInstallment'), r => r.initialInstallment, r => formatCurrency(r.initialInstallment)),
  numericColumn('maxInstallment', t('mortgage.comparisonTable.maxInstallment'), r => r.maxInstallment, r => formatCurrency(r.maxInstallment)),
  numericColumn('totalInterest', t('mortgage.comparisonTable.interest'), r => r.totalInterest, r => formatCurrency(r.totalInterest)),
  numericColumn('upfront', t('mortgage.comparisonTable.upfront'), r => r.totalUpfrontCost, r => formatCurrency(r.totalUpfrontCost), t('mortgage.comparisonTable.hints.upfront')),
  numericColumn('bindingGross', t('mortgage.comparisonTable.bindingGross'), r => r.totalBindingGrossCost, r => formatCurrency(r.totalBindingGrossCost), t('mortgage.comparisonTable.hints.bindingGross')),
  numericColumn('bindingNet', t('mortgage.comparisonTable.bindingNet'), r => r.totalBindingNetCost, r => formatCurrency(r.totalBindingNetCost), t('mortgage.comparisonTable.hints.bindingNet')),
  numericColumn('totalCost', t('mortgage.comparisonTable.totalCost'), r => r.totalCost, r => formatCurrency(r.totalCost)),
  numericColumn('officialApr', t('mortgage.comparisonTable.officialApr'), r => r.apr.officialApr, r => formatPercent(r.apr.officialApr), t('mortgage.comparisonTable.hints.officialApr')),
  numericColumn('realApr', t('mortgage.comparisonTable.realApr'), r => r.apr.realApr, r => formatPercent(r.apr.realApr), t('mortgage.comparisonTable.hints.realApr')),
  numericColumn('downPayment', t('mortgage.comparisonTable.downPayment'), r => r.opportunityCost.downPayment, r => formatCurrency(r.opportunityCost.downPayment)),
  numericColumn('freeCapital', t('mortgage.comparisonTable.freeCapital'), r => r.opportunityCost.freeCapital, r => formatCurrency(r.opportunityCost.freeCapital)),
  numericColumn('netWorth', t('mortgage.comparisonTable.netWorth'), r => r.netWorth, r => formatCurrency(r.netWorth)),
])

const sorting = ref<SortingState>([{ id: 'realApr', desc: false }])

const table = useVueTable({
  get data() {
    return enabledResults.value
  },
  get columns() {
    return columns.value
  },
  state: {
    get sorting() {
      return sorting.value
    },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === 'function' ? updater(sorting.value) : updater
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
})

const best = computed(() =>
  enabledResults.value.find(result => result.mortgage.id === comparison.value?.bestByAprId) ?? null,
)

/** Podium: the winner by real APR plus its closest rival. */
const podium = computed(() => {
  const ranked = enabledResults.value
    .filter(result => rankOf(result) !== null)
    .sort((a, b) => (rankOf(a) ?? 0) - (rankOf(b) ?? 0))
  return ranked.slice(0, 2)
})

/** Extra cost of an offer versus the winner, in euros and in percentage points of APR. */
function gapToBest(result: MortgageResult): { euros: number, pp: number | null } | null {
  const winner = best.value
  if (!winner || winner.mortgage.id === result.mortgage.id) return null
  const pp = result.apr.realApr !== null && winner.apr.realApr !== null
    ? result.apr.realApr - winner.apr.realApr
    : null
  return { euros: result.totalCost - winner.totalCost, pp }
}

function hintOf(columnId: string): string | undefined {
  const column = columns.value.find(item => item.id === columnId)
  return (column?.meta as { hint?: string } | undefined)?.hint
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">
        {{ $t('mortgage.comparisonTable.title') }}
      </CardTitle>
      <CardDescription>
        {{ $t('mortgage.comparisonTable.description') }}
      </CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <div
        v-if="!enabledResults.length"
        class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground"
      >
        {{ $t('mortgage.comparisonTable.empty') }}
      </div>

      <template v-else>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            v-for="result in podium"
            :key="result.mortgage.id"
            :class="cn(
              'rounded-lg border p-3',
              rankOf(result) === 1 ? 'border-green-500/40 bg-green-500/5' : 'bg-muted/40',
            )"
          >
            <div class="flex items-center gap-2">
              <span
                class="size-2.5 rounded-full"
                :style="{ backgroundColor: result.mortgage.color }"
              />
              <span class="font-semibold">{{ result.mortgage.name }}</span>
              <Trophy
                v-if="rankOf(result) === 1"
                class="size-4 text-green-600 dark:text-green-400"
              />
              <Badge
                v-else
                variant="outline"
              >
                #{{ rankOf(result) }}
              </Badge>
              <span class="ml-auto font-semibold">{{ formatPercent(result.apr.realApr) }}</span>
            </div>
            <p
              v-if="gapToBest(result)"
              class="mt-1 text-xs text-muted-foreground"
            >
              {{ $t('mortgage.comparisonTable.gap', { amount: formatCurrency(gapToBest(result)?.euros) }) }}
              <template v-if="gapToBest(result)?.pp !== null">
                {{ $t('mortgage.comparisonTable.gapPp', { pp: formatPercent(gapToBest(result)?.pp ?? 0, ' pp') }) }}
              </template>
            </p>
            <p
              v-else
              class="mt-1 text-xs text-muted-foreground"
            >
              {{ $t('mortgage.comparisonTable.bestCaption', { value: formatCurrency(result.totalCost) }) }}
            </p>
          </div>
        </div>

        <div
          v-if="comparison?.rankingMismatch"
          class="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
        >
          <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-500" />
          <span>
            {{ $t('mortgage.comparisonTable.rankingMismatch') }}
          </span>
        </div>

        <p
          v-if="comparison?.crossoverYear"
          class="text-xs text-muted-foreground"
        >
          {{ $t('mortgage.comparisonTable.crossover', { year: comparison.crossoverYear }) }}
        </p>

        <div>
          <Table class="min-w-6xl">
            <TableHeader>
              <TableRow
                v-for="headerGroup in table.getHeaderGroups()"
                :key="headerGroup.id"
              >
                <TableHead
                  v-for="header in headerGroup.headers"
                  :key="header.id"
                  :title="hintOf(header.column.id)"
                  :class="cn(
                    'whitespace-nowrap',
                    header.column.id === 'name'
                      ? 'sticky left-0 z-10 min-w-52 border-r bg-background'
                      : 'text-right',
                    header.column.getCanSort() && 'cursor-pointer select-none',
                  )"
                  @click="header.column.getToggleSortingHandler()?.($event)"
                >
                  <span class="inline-flex items-center gap-1">
                    <FlexRender
                      :render="header.column.columnDef.header"
                      :props="header.getContext()"
                    />
                    <ArrowUp
                      v-if="header.column.getIsSorted() === 'asc'"
                      class="size-3"
                    />
                    <ArrowDown
                      v-else-if="header.column.getIsSorted() === 'desc'"
                      class="size-3"
                    />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="row in table.getRowModel().rows"
                :key="row.id"
                :class="row.original.mortgage.id === comparison?.bestByAprId ? 'bg-green-500/5' : ''"
              >
                <TableCell
                  v-for="cell in row.getVisibleCells()"
                  :key="cell.id"
                  :class="cn(
                    'whitespace-nowrap',
                    cell.column.id === 'name'
                      ? cn(
                        'sticky left-0 z-10 border-r font-medium',
                        row.original.mortgage.id === comparison?.bestByAprId
                          ? 'bg-green-50 dark:bg-green-950'
                          : 'bg-background',
                      )
                      : 'text-right',
                    cell.column.id === 'realApr' && 'font-semibold',
                  )"
                >
                  <FlexRender
                    :render="cell.column.columnDef.cell"
                    :props="cell.getContext()"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <p class="text-xs text-muted-foreground">
          {{ $t('mortgage.comparisonTable.sortHint') }}
        </p>
      </template>
    </CardContent>
  </Card>
</template>
