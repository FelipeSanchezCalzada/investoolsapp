<script setup lang="ts">
import { Plus, Trash2, GripVertical, Copy, Check, ClipboardPaste } from '@lucide/vue'
import { toast } from 'vue-sonner'
import draggable from 'vuedraggable'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldInput,
} from '@/components/ui/number-field'
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Workspace } from '~/db/types'
import useFrontDB from '~/db/useFrontDB'

type PortfolioRebalancingHelper = NonNullable<Workspace['portfolioRebalancingHelper']>
type TargetFund = PortfolioRebalancingHelper['target'][number]

const { t, locale } = useI18n()

const { selectedWorkspace } = storeToRefs(useFrontDB())

const targetFunds = computed<TargetFund[]>({
  get: () => selectedWorkspace.value?.portfolioRebalancingHelper?.target ?? [],
  set: (val) => {
    if (selectedWorkspace.value?.portfolioRebalancingHelper) {
      selectedWorkspace.value.portfolioRebalancingHelper.target = val
    }
  },
})

const totalCurrentAmount = computed(() =>
  (selectedWorkspace.value?.portfolioRebalancingHelper?.current ?? [])
    .reduce((sum, f) => sum + (f.amount || 0), 0),
)

const totalTargetPercentage = computed(() =>
  targetFunds.value.reduce((sum, f) => sum + (f.percentage || 0), 0),
)

const isTargetValid = computed(() =>
  Math.abs(totalTargetPercentage.value - 100) < 0.01,
)

function getTargetAmount(fund: TargetFund): number {
  return totalCurrentAmount.value * (fund.percentage / 100)
}

function addTargetFund() {
  targetFunds.value.push({
    id: crypto.randomUUID(),
    name: '',
    isin: '',
    percentage: 0,
  })
}

function removeTargetFund(id: string) {
  const idx = targetFunds.value.findIndex(f => f.id === id)
  if (idx !== -1) targetFunds.value.splice(idx, 1)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatPercentage(value: number): string {
  return `${value.toFixed(2)} %`
}

// --- Copy / Paste ---

const copiedTarget = ref(false)

function copyTargetPortfolio() {
  if (targetFunds.value.length === 0) return
  const sanitize = (s: string) => s.replace(/\t/g, ' ').trim()
  const lines = targetFunds.value.map(f => `${sanitize(f.name)}\t${sanitize(f.isin)}\t${f.percentage}`)
  navigator.clipboard.writeText(lines.join('\n'))
  copiedTarget.value = true
  setTimeout(() => {
    copiedTarget.value = false
  }, 1500)
  toast.success(t('portfolioRebalancing.target.copyToast'))
}

async function pasteTargetPortfolio() {
  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) {
      toast.error(t('portfolioRebalancing.target.clipboardEmpty'))
      return
    }
    const lines = text.trim().split('\n').filter(l => l.trim())
    const funds: TargetFund[] = lines.map((line) => {
      const parts = line.split('\t')
      return {
        id: crypto.randomUUID(),
        name: parts[0]?.trim() ?? '',
        isin: parts[1]?.trim() ?? '',
        percentage: Number.parseFloat(parts[2]?.trim() ?? '0') || 0,
      }
    })
    targetFunds.value.splice(0, targetFunds.value.length, ...funds)
    toast.success(t('portfolioRebalancing.target.pastedToast', { count: funds.length }, funds.length))
  } catch {
    toast.error(t('portfolioRebalancing.target.clipboardError'))
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <div>
          <CardTitle>{{ $t('portfolioRebalancing.target.title') }}</CardTitle>
          <CardDescription>
            {{ $t('portfolioRebalancing.target.description') }}
          </CardDescription>
        </div>
        <div class="text-right">
          <Badge
            :variant="isTargetValid ? 'default' : totalTargetPercentage > 100 ? 'destructive' : 'secondary'"
          >
            {{ formatPercentage(totalTargetPercentage) }}
          </Badge>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <!-- Desktop table -->
      <div
        v-if="targetFunds.length > 0"
        class="hidden md:block overflow-x-auto"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead class="w-10" />
              <TableHead>{{ $t('portfolioRebalancing.current.fundName') }}</TableHead>
              <TableHead>{{ $t('portfolioRebalancing.current.isin') }}</TableHead>
              <TableHead class="text-right">
                {{ $t('portfolioRebalancing.target.targetShare') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('portfolioRebalancing.target.resultingAmount') }}
              </TableHead>
              <TableHead class="w-10" />
            </TableRow>
          </TableHeader>
          <draggable
            v-model="targetFunds"
            tag="tbody"
            handle=".drag-handle"
            itemKey="id"
            :animation="200"
          >
            <template #item="{ element: fund }">
              <TableRow>
                <TableCell class="w-10">
                  <GripVertical class="drag-handle size-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                </TableCell>
                <TableCell>
                  <Input
                    v-model="fund.name"
                    :placeholder="$t('portfolioRebalancing.current.namePlaceholder')"
                    class="h-9"
                  />
                </TableCell>
                <TableCell class="w-50">
                  <Input
                    v-model="fund.isin"
                    :placeholder="$t('portfolioRebalancing.current.isinPlaceholder')"
                    class="h-9 font-mono"
                  />
                </TableCell>
                <TableCell class="text-right w-50">
                  <NumberField
                    v-model="fund.percentage"
                    :min="0"
                    :max="100"
                    :step="0.01"
                    :locale="locale"
                    :formatOptions="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                  >
                    <NumberFieldContent>
                      <NumberFieldInput />
                    </NumberFieldContent>
                  </NumberField>
                </TableCell>
                <TableCell class="text-right tabular-nums font-medium w-40">
                  {{ formatCurrency(getTargetAmount(fund)) }}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    @click="removeTargetFund(fund.id)"
                  >
                    <Trash2 class="size-4 text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            </template>
          </draggable>
        </Table>
      </div>

      <!-- Mobile cards -->
      <draggable
        v-if="targetFunds.length > 0"
        v-model="targetFunds"
        handle=".drag-handle"
        itemKey="id"
        :animation="200"
        class="flex flex-col gap-3 md:hidden"
      >
        <template #item="{ element: fund, index }">
          <div class="rounded-lg border p-3 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <GripVertical class="drag-handle size-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                <span class="text-xs font-medium text-muted-foreground">{{ $t('portfolioRebalancing.current.fundIndex', { index: index + 1 }) }}</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                @click="removeTargetFund(fund.id)"
              >
                <Trash2 class="size-4 text-muted-foreground" />
              </Button>
            </div>
            <Input
              v-model="fund.name"
              :placeholder="$t('portfolioRebalancing.current.fundName')"
              class="h-9"
            />
            <Input
              v-model="fund.isin"
              :placeholder="$t('portfolioRebalancing.current.isin')"
              class="h-9 font-mono"
            />
            <div class="flex items-center gap-2">
              <div class="flex-1">
                <NumberField
                  v-model="fund.percentage"
                  :min="0"
                  :max="100"
                  :step="0.01"
                  :locale="locale"
                  :formatOptions="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                >
                  <NumberFieldContent>
                    <NumberFieldInput />
                  </NumberFieldContent>
                </NumberField>
              </div>
              <span class="text-sm font-medium tabular-nums shrink-0">
                {{ formatCurrency(getTargetAmount(fund)) }}
              </span>
            </div>
          </div>
        </template>
      </draggable>

      <div
        v-if="targetFunds.length === 0"
        class="flex flex-col items-center justify-center py-8 text-muted-foreground"
      >
        <p class="text-sm">
          {{ $t('portfolioRebalancing.target.empty') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 mt-4">
        <Button
          variant="outline"
          size="sm"
          @click="addTargetFund"
        >
          <Plus class="size-4 mr-2" />
          {{ $t('portfolioRebalancing.current.addFund') }}
        </Button>

        <p
          v-if="targetFunds.length > 0 && !isTargetValid"
          class="text-sm text-destructive"
        >
          {{ $t('portfolioRebalancing.target.mustSum100') }}
        </p>

        <div class="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            :disabled="targetFunds.length === 0"
            @click="copyTargetPortfolio"
          >
            <component
              :is="copiedTarget ? Check : Copy"
              :class="cn('size-4 mr-2', copiedTarget && 'text-green-500')"
            />
            {{ copiedTarget ? $t('portfolioRebalancing.target.copied') : $t('portfolioRebalancing.target.copy') }}
          </Button>

          <Button
            variant="outline"
            size="sm"
            @click="pasteTargetPortfolio"
          >
            <ClipboardPaste class="size-4 mr-2" />
            {{ $t('portfolioRebalancing.target.paste') }}
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
