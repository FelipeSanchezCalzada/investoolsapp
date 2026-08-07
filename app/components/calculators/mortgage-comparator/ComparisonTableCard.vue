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

const nameColumn: ColumnDef<MortgageResult> = {
  id: 'name',
  accessorFn: result => result.mortgage.name,
  header: 'Hipoteca',
  enableSorting: false,
  cell: ({ row }) => {
    const result = row.original
    const rank = rankOf(result)
    const netWorthRank = netWorthRankOf(result)
    const captions: string[] = []
    if (rank) captions.push(`TAE #${rank}`)
    if (netWorthRank) captions.push(`patrimonio #${netWorthRank}`)
    if (!result.viable) captions.push('no viable')

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
}

const columns: ColumnDef<MortgageResult>[] = [
  nameColumn,
  numericColumn('initialInstallment', 'Cuota inicial', r => r.initialInstallment, r => formatCurrency(r.initialInstallment)),
  numericColumn('maxInstallment', 'Cuota máxima', r => r.maxInstallment, r => formatCurrency(r.maxInstallment)),
  numericColumn('totalInterest', 'Intereses', r => r.totalInterest, r => formatCurrency(r.totalInterest)),
  numericColumn('upfront', 'Gastos', r => r.totalUpfrontCost, r => formatCurrency(r.totalUpfrontCost), 'A tu cargo, comisión de apertura incluida'),
  numericColumn('bindingGross', 'Vinculaciones (bruto)', r => r.totalBindingGrossCost, r => formatCurrency(r.totalBindingGrossCost), 'Lo que pagas al banco por los productos'),
  numericColumn('bindingNet', 'Vinculaciones (neto)', r => r.totalBindingNetCost, r => formatCurrency(r.totalBindingNetCost), 'Descontando lo que gastarías igualmente fuera'),
  numericColumn('totalCost', 'Coste total', r => r.totalCost, r => formatCurrency(r.totalCost)),
  numericColumn('officialApr', 'TAE oficial', r => r.apr.officialApr, r => formatPercent(r.apr.officialApr), 'Criterio del Banco de España: solo vinculaciones obligatorias, a coste bruto'),
  numericColumn('realApr', 'TAE real', r => r.apr.realApr, r => formatPercent(r.apr.realApr), 'La métrica que decide el ranking'),
  numericColumn('downPayment', 'Entrada', r => r.opportunityCost.downPayment, r => formatCurrency(r.opportunityCost.downPayment)),
  numericColumn('freeCapital', 'Capital libre', r => r.opportunityCost.freeCapital, r => formatCurrency(r.opportunityCost.freeCapital)),
  numericColumn('netWorth', 'Patrimonio neto', r => r.netWorth, r => formatCurrency(r.netWorth)),
]

const sorting = ref<SortingState>([{ id: 'realApr', desc: false }])

const table = useVueTable({
  get data() {
    return enabledResults.value
  },
  columns,
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
  const column = columns.find(item => item.id === columnId)
  return (column?.meta as { hint?: string } | undefined)?.hint
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">
        Comparativa
      </CardTitle>
      <CardDescription>
        La ganadora se decide por <strong>TAE real</strong>: incluye gastos a tu cargo, comisión de
        apertura y el coste neto de las vinculaciones. El patrimonio neto va al lado como segunda
        lectura, pero depende de una rentabilidad hipotética y no manda sobre el ranking.
      </CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <div
        v-if="!enabledResults.length"
        class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground"
      >
        No hay hipotecas activas en la comparativa.
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
              {{ formatCurrency(gapToBest(result)?.euros) }} más cara en coste total
              <template v-if="gapToBest(result)?.pp !== null">
                ({{ formatPercent(gapToBest(result)?.pp ?? 0, ' pp') }} de TAE real)
              </template>
            </p>
            <p
              v-else
              class="mt-1 text-xs text-muted-foreground"
            >
              Mejor TAE real · coste total {{ formatCurrency(result.totalCost) }}
            </p>
          </div>
        </div>

        <div
          v-if="comparison?.rankingMismatch"
          class="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
        >
          <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-500" />
          <span>
            Los dos rankings no coinciden: la oferta con menor TAE real no es la que te deja más
            patrimonio. Suele pasar cuando la barata exige más entrada y te queda menos ahorro
            invertido. Se destaca igualmente la de menor TAE real, porque el patrimonio depende de
            una rentabilidad que aún no ha ocurrido.
          </span>
        </div>

        <p
          v-if="comparison?.crossoverYear"
          class="text-xs text-muted-foreground"
        >
          El coste acumulado de las dos mejores ofertas se cruza en el año
          {{ comparison.crossoverYear }}: antes de ese punto la otra sale mejor.
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
          Pulsa una cabecera para ordenar. Las hipotecas no viables (el ahorro no cubre entrada más
          gastos) se muestran, pero quedan fuera del ranking.
        </p>
      </template>
    </CardContent>
  </Card>
</template>
