<script setup lang="ts">
import { Plus, Trash2, ArrowRightLeft, TrendingUp, TrendingDown, Copy, Check, GripVertical, ChevronDown, ChevronRight, ClipboardPaste } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import draggable from 'vuedraggable'
import { PAGE_NAMES } from '~/pages/routeNames'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
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
type CurrentFund = PortfolioRebalancingHelper['current'][number]
type TargetFund = PortfolioRebalancingHelper['target'][number]
type Transfer = PortfolioRebalancingHelper['dcaTransfers'][number][number]

definePageMeta({
  name: PAGE_NAMES.HELPERS.PORTFOLIO_REBALANCING,
  breadcrumb: [
    { label: 'Home', to: { name: PAGE_NAMES.INDEX } },
    { label: 'Rebalanceo de fondos' },
  ],
})

// --- Locale ---

const browserLocale = 'es-ES'

// --- State (persisted via useFrontDB) ---

const { selectedWorkspace } = storeToRefs(useFrontDB())

function getInitialData(): PortfolioRebalancingHelper {
  return {
    current: [],
    target: [],
    dcaTransfers: [],
  }
}

const collapsedParts = ref<Set<number>>(new Set())

function ensurePortfolioData(ws: Workspace) {
  if (!ws.portfolioRebalancingHelper) {
    ws.portfolioRebalancingHelper = getInitialData()
  }
}

watchImmediate(selectedWorkspace, (ws) => {
  if (ws) {
    ensurePortfolioData(ws)
  }
  collapsedParts.value = new Set()
})

const portfolio = computed<PortfolioRebalancingHelper>(() => {
  const ws = selectedWorkspace.value
  if (!ws) {
    return getInitialData()
  }
  return ws.portfolioRebalancingHelper!
})

// --- Computed ---

const totalCurrentAmount = computed(() =>
  portfolio.value.current.reduce((sum, f) => sum + (f.amount || 0), 0),
)

const totalTargetPercentage = computed(() =>
  portfolio.value.target.reduce((sum, f) => sum + (f.percentage || 0), 0),
)

const isTargetValid = computed(() =>
  Math.abs(totalTargetPercentage.value - 100) < 0.01,
)

const canCalculate = computed(() =>
  portfolio.value.current.length > 0
  && portfolio.value.target.length > 0
  && totalCurrentAmount.value > 0
  && isTargetValid.value,
)

function getCurrentPercentage(fund: CurrentFund): number {
  if (totalCurrentAmount.value === 0) return 0
  return (fund.amount / totalCurrentAmount.value) * 100
}

function getTargetAmount(fund: TargetFund): number {
  return totalCurrentAmount.value * (fund.percentage / 100)
}

// --- Actions ---

function addCurrentFund() {
  portfolio.value.current.push({
    id: crypto.randomUUID(),
    name: '',
    isin: '',
    amount: 0,
  })
}

function removeCurrentFund(id: string) {
  const idx = portfolio.value.current.findIndex(f => f.id === id)
  if (idx !== -1) portfolio.value.current.splice(idx, 1)
}

function addTargetFund() {
  portfolio.value.target.push({
    id: crypto.randomUUID(),
    name: '',
    isin: '',
    percentage: 0,
  })
}

function removeTargetFund(id: string) {
  const idx = portfolio.value.target.findIndex(f => f.id === id)
  if (idx !== -1) portfolio.value.target.splice(idx, 1)
}

// --- DCA ---

const dcaParts = ref(1)

function togglePartCollapsed(partIndex: number) {
  if (collapsedParts.value.has(partIndex)) {
    collapsedParts.value.delete(partIndex)
  } else {
    collapsedParts.value.add(partIndex)
  }
}

function isPartComplete(part: Transfer[]): boolean {
  return part.length > 0 && part.every(t => t.done)
}

function partProgress(part: Transfer[]): { done: number, total: number } {
  return { done: part.filter(t => t.done).length, total: part.length }
}

const globalProgress = computed(() => {
  const all = portfolio.value.dcaTransfers.flat()
  if (all.length === 0) return { done: 0, total: 0, percent: 0 }
  const done = all.filter(t => t.done).length
  return { done, total: all.length, percent: Math.round((done / all.length) * 100) }
})

// --- Rebalancing algorithm ---

const dcaTransfers = computed(() => portfolio.value.dcaTransfers)
const hasCalculated = computed(() => portfolio.value.dcaTransfers.length > 0)

function calculateRebalancing() {
  if (!canCalculate.value) return

  const total = totalCurrentAmount.value

  // Build a map of ISIN -> { name, current amount, target amount }
  const fundMap = new Map<string, { name: string, current: number, target: number }>()

  for (const f of portfolio.value.current) {
    fundMap.set(f.isin, {
      name: f.name,
      current: f.amount,
      target: 0,
    })
  }

  for (const f of portfolio.value.target) {
    const targetAmount = total * (f.percentage / 100)
    if (fundMap.has(f.isin)) {
      fundMap.get(f.isin)!.target = targetAmount
      if (f.name) fundMap.get(f.isin)!.name = f.name
    } else {
      fundMap.set(f.isin, {
        name: f.name,
        current: 0,
        target: targetAmount,
      })
    }
  }

  // Calculate diffs: positive = needs money, negative = has excess
  const sources: { isin: string, name: string, excess: number }[] = []
  const destinations: { isin: string, name: string, needed: number }[] = []

  for (const [isin, data] of fundMap) {
    const diff = data.target - data.current
    if (diff < -0.01) {
      sources.push({ isin, name: data.name, excess: -diff })
    } else if (diff > 0.01) {
      destinations.push({ isin, name: data.name, needed: diff })
    }
  }

  // Greedy matching: minimize number of transfers
  sources.sort((a, b) => b.excess - a.excess)
  destinations.sort((a, b) => b.needed - a.needed)

  const fullTransfers: Transfer[] = []
  let si = 0
  let di = 0

  while (si < sources.length && di < destinations.length) {
    const source = sources[si]!
    const dest = destinations[di]!
    const transferAmount = Math.min(source.excess, dest.needed)

    if (transferAmount > 0.01) {
      fullTransfers.push({
        fromName: source.name,
        fromIsin: source.isin,
        toName: dest.name,
        toIsin: dest.isin,
        amount: Math.round(transferAmount * 100) / 100,
        done: false,
      })
    }

    source.excess -= transferAmount
    dest.needed -= transferAmount

    if (source.excess < 0.01) si++
    if (dest.needed < 0.01) di++
  }

  // Split into DCA parts
  const parts = Math.max(1, dcaParts.value)
  const result: Transfer[][] = []

  for (let p = 0; p < parts; p++) {
    result.push(fullTransfers.map(t => ({
      ...t,
      amount: Math.round((t.amount / parts) * 100) / 100,
      done: false,
    })))
  }

  portfolio.value.dcaTransfers = result
  collapsedParts.value = new Set()

  const totalTransfers = fullTransfers.length
  if (totalTransfers === 0) {
    toast.success('Tu cartera ya está balanceada')
  } else {
    toast.success('Traspasos calculados')
  }
}

const copiedKey = ref<string | null>(null)

function copyIsin(isin: string, key: string) {
  navigator.clipboard.writeText(isin)
  copiedKey.value = key
  setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = null
  }, 1500)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatPercentage(value: number): string {
  return `${value.toFixed(2)} %`
}

// --- Copy / Paste target portfolio ---

const copiedTarget = ref(false)

function copyTargetPortfolio() {
  if (portfolio.value.target.length === 0) return
  const sanitize = (s: string) => s.replace(/\t/g, ' ').trim()
  const lines = portfolio.value.target.map(f => `${sanitize(f.name)}\t${sanitize(f.isin)}\t${f.percentage}`)
  navigator.clipboard.writeText(lines.join('\n'))
  copiedTarget.value = true
  setTimeout(() => {
    copiedTarget.value = false
  }, 1500)
  toast.success('Cartera objetivo copiada al portapapeles')
}

async function pasteTargetPortfolio() {
  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) {
      toast.error('El portapapeles está vacío')
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
    portfolio.value.target.splice(0, portfolio.value.target.length, ...funds)
    toast.success(`${funds.length} fondo${funds.length > 1 ? 's' : ''} pegado${funds.length > 1 ? 's' : ''}`)
  } catch {
    toast.error('No se pudo leer el portapapeles')
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 p-3 sm:p-6 max-w-7xl mx-auto">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Rebalanceo de Cartera
      </h1>
      <p class="text-muted-foreground mt-1">
        Introduce tu cartera actual y la distribución objetivo para calcular los traspasos óptimos.
      </p>
    </div>

    <!-- Current Portfolio -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle>Cartera Actual</CardTitle>
            <CardDescription>
              Fondos que tienes actualmente. El porcentaje se calcula automáticamente.
            </CardDescription>
          </div>
          <div class="text-right">
            <div class="text-sm text-muted-foreground">
              Total
            </div>
            <div class="text-lg font-semibold">
              {{ formatCurrency(totalCurrentAmount) }}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <!-- Desktop table -->
        <div
          v-if="portfolio.current.length > 0"
          class="hidden md:block overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-10" />
                <TableHead>Nombre del fondo</TableHead>
                <TableHead>ISIN</TableHead>
                <TableHead class="text-right">
                  Monto (€)
                </TableHead>
                <TableHead class="text-right">
                  % Cartera
                </TableHead>
                <TableHead class="w-10" />
              </TableRow>
            </TableHeader>
            <draggable
              v-model="portfolio.current"
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
                      placeholder="Ej: Amundi MSCI World"
                      class="h-9"
                    />
                  </TableCell>
                  <TableCell class="w-50">
                    <Input
                      v-model="fund.isin"
                      placeholder="Ej: LU1234567890"
                      class="h-9 font-mono"
                    />
                  </TableCell>
                  <TableCell class="text-right w-60">
                    <NumberField
                      v-model="fund.amount"
                      :min="0"
                      :step="0.01"
                      :locale="browserLocale"
                      :formatOptions="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                    >
                      <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput />
                        <NumberFieldIncrement />
                      </NumberFieldContent>
                    </NumberField>
                  </TableCell>
                  <TableCell class="text-right tabular-nums w-30">
                    {{ formatPercentage(getCurrentPercentage(fund)) }}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      @click="removeCurrentFund(fund.id)"
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
          v-if="portfolio.current.length > 0"
          v-model="portfolio.current"
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
                  <span class="text-xs font-medium text-muted-foreground">Fondo {{ index + 1 }}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  @click="removeCurrentFund(fund.id)"
                >
                  <Trash2 class="size-4 text-muted-foreground" />
                </Button>
              </div>
              <Input
                v-model="fund.name"
                placeholder="Nombre del fondo"
                class="h-9"
              />
              <Input
                v-model="fund.isin"
                placeholder="ISIN"
                class="h-9 font-mono"
              />
              <div class="flex items-center gap-2">
                <div class="flex-1">
                  <NumberField
                    v-model="fund.amount"
                    :min="0"
                    :step="0.01"
                    :locale="browserLocale"
                    :formatOptions="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                  >
                    <NumberFieldContent>
                      <NumberFieldDecrement />
                      <NumberFieldInput />
                      <NumberFieldIncrement />
                    </NumberFieldContent>
                  </NumberField>
                </div>
                <Badge
                  variant="secondary"
                  class="shrink-0 tabular-nums"
                >
                  {{ formatPercentage(getCurrentPercentage(fund)) }}
                </Badge>
              </div>
            </div>
          </template>
        </draggable>

        <div
          v-if="portfolio.current.length === 0"
          class="flex flex-col items-center justify-center py-8 text-muted-foreground"
        >
          <p class="text-sm">
            No hay fondos en la cartera actual.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          class="mt-4"
          @click="addCurrentFund"
        >
          <Plus class="size-4 mr-2" />
          Añadir fondo
        </Button>
      </CardContent>
    </Card>

    <!-- Target Portfolio -->
    <Card>
      <CardHeader>
        <div class="flex items-center justify-between">
          <div>
            <CardTitle>Cartera Objetivo</CardTitle>
            <CardDescription>
              Distribución deseada tras el rebalanceo. El monto se calcula automáticamente.
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
          v-if="portfolio.target.length > 0"
          class="hidden md:block overflow-x-auto"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-10" />
                <TableHead>Nombre del fondo</TableHead>
                <TableHead>ISIN</TableHead>
                <TableHead class="text-right">
                  % Objetivo
                </TableHead>
                <TableHead class="text-right">
                  Monto resultante
                </TableHead>
                <TableHead class="w-10" />
              </TableRow>
            </TableHeader>
            <draggable
              v-model="portfolio.target"
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
                      placeholder="Ej: Amundi MSCI World"
                      class="h-9"
                    />
                  </TableCell>
                  <TableCell class="w-50">
                    <Input
                      v-model="fund.isin"
                      placeholder="Ej: LU1234567890"
                      class="h-9 font-mono"
                    />
                  </TableCell>
                  <TableCell class="text-right w-50">
                    <NumberField
                      v-model="fund.percentage"
                      :min="0"
                      :max="100"
                      :step="0.01"
                      :locale="browserLocale"
                      :formatOptions="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                    >
                      <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput />
                        <NumberFieldIncrement />
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
          v-if="portfolio.target.length > 0"
          v-model="portfolio.target"
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
                  <span class="text-xs font-medium text-muted-foreground">Fondo {{ index + 1 }}</span>
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
                placeholder="Nombre del fondo"
                class="h-9"
              />
              <Input
                v-model="fund.isin"
                placeholder="ISIN"
                class="h-9 font-mono"
              />
              <div class="flex items-center gap-2">
                <div class="flex-1">
                  <NumberField
                    v-model="fund.percentage"
                    :min="0"
                    :max="100"
                    :step="0.01"
                    :locale="browserLocale"
                    :formatOptions="{ minimumFractionDigits: 2, maximumFractionDigits: 2 }"
                  >
                    <NumberFieldContent>
                      <NumberFieldDecrement />
                      <NumberFieldInput />
                      <NumberFieldIncrement />
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
          v-if="portfolio.target.length === 0"
          class="flex flex-col items-center justify-center py-8 text-muted-foreground"
        >
          <p class="text-sm">
            No hay fondos en la cartera objetivo.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 mt-4">
          <Button
            variant="outline"
            size="sm"
            @click="addTargetFund"
          >
            <Plus class="size-4 mr-2" />
            Añadir fondo
          </Button>

          <p
            v-if="portfolio.target.length > 0 && !isTargetValid"
            class="text-sm text-destructive"
          >
            Los porcentajes deben sumar exactamente 100%.
          </p>

          <div class="flex items-center gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              :disabled="portfolio.target.length === 0"
              @click="copyTargetPortfolio"
            >
              <component
                :is="copiedTarget ? Check : Copy"
                :class="cn('size-4 mr-2', copiedTarget && 'text-green-500')"
              />
              {{ copiedTarget ? 'Copiada' : 'Copiar cartera' }}
            </Button>

            <Button
              variant="outline"
              size="sm"
              @click="pasteTargetPortfolio"
            >
              <ClipboardPaste class="size-4 mr-2" />
              Pegar cartera
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Calculate Button + DCA config -->
    <Card>
      <CardContent class="pt-6">
        <div class="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <div class="flex items-center gap-3">
            <label
              for="dca-parts"
              class="text-sm font-medium whitespace-nowrap"
            >
              Dividir en partes (DCA)
            </label>
            <NumberField
              id="dca-parts"
              v-model="dcaParts"
              :min="1"
              :max="24"
              :step="1"
              class="w-36"
            >
              <NumberFieldContent>
                <NumberFieldDecrement />
                <NumberFieldInput />
                <NumberFieldIncrement />
              </NumberFieldContent>
            </NumberField>
          </div>
          <Button
            size="lg"
            :disabled="!canCalculate"
            @click="calculateRebalancing"
          >
            <ArrowRightLeft class="size-4 mr-2" />
            Calcular traspasos
          </Button>
        </div>
        <p class="text-xs text-muted-foreground text-center mt-3">
          {{ dcaParts > 1
            ? `Los traspasos se dividirán en ${dcaParts} partes iguales para hacer DCA.`
            : 'Se calculará un único traspaso por movimiento.'
          }}
        </p>
      </CardContent>
    </Card>

    <!-- Results -->
    <Card v-if="hasCalculated">
      <CardHeader>
        <CardTitle>Traspasos necesarios</CardTitle>
        <CardDescription>
          {{ dcaTransfers.length === 0
            ? 'Tu cartera ya está balanceada. No se necesitan traspasos.'
            : dcaTransfers.length === 1
              ? `Se necesitan ${dcaTransfers[0]!.length} traspaso${dcaTransfers[0]!.length > 1 ? 's' : ''} para rebalancear tu cartera.`
              : `Se necesitan ${dcaTransfers[0]!.length} traspaso${dcaTransfers[0]!.length > 1 ? 's' : ''} divididos en ${dcaTransfers.length} partes (DCA).`
          }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <!-- Progress bar -->
        <div
          v-if="globalProgress.total > 0"
          class="mb-5"
        >
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">
              Progreso
            </span>
            <span class="text-sm tabular-nums text-muted-foreground">
              {{ globalProgress.done }} de {{ globalProgress.total }} completados
            </span>
          </div>
          <Progress
            :modelValue="globalProgress.percent"
            class="h-2"
          />
        </div>

        <div
          v-if="dcaTransfers.length > 0"
          class="flex flex-col gap-4"
        >
          <!-- Single part: no grouping header -->
          <template v-if="dcaTransfers.length === 1">
            <div class="flex flex-col gap-3">
              <div
                v-for="(transfer, tIndex) in dcaTransfers[0]"
                :key="tIndex"
                :class="cn(
                  'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all duration-200',
                  transfer.done
                    ? 'bg-muted/10 border-muted text-muted-foreground/50'
                    : 'bg-muted/30',
                )"
              >
                <div class="flex items-center gap-3 sm:gap-4">
                  <Checkbox
                    v-model="transfer.done"
                    class="size-5 shrink-0"
                  />
                  <div
                    :class="cn(
                      'flex items-center justify-center size-8 rounded-full text-sm font-semibold shrink-0',
                      transfer.done
                        ? 'bg-muted/30 text-muted-foreground/50'
                        : 'bg-primary/10 text-primary',
                    )"
                  >
                    {{ tIndex + 1 }}
                  </div>
                  <span :class="cn('text-lg font-semibold tabular-nums sm:hidden', transfer.done && 'text-muted-foreground/50')">
                    {{ formatCurrency(transfer.amount) }}
                  </span>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 pl-11 sm:pl-0">
                  <div class="flex items-center gap-2 min-w-0 sm:flex-1">
                    <Badge
                      :variant="transfer.done ? undefined : 'destructive'"
                      :class="cn('shrink-0', transfer.done && 'bg-muted text-muted-foreground/60 hover:bg-muted')"
                    >
                      <TrendingDown class="size-3 mr-1" />
                      Origen
                    </Badge>
                    <div class="flex flex-col min-w-0">
                      <span :class="cn('text-sm font-medium truncate', transfer.done && 'text-muted-foreground/50')">{{ transfer.fromName }}</span>
                      <span class="inline-flex items-center gap-1">
                        <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')">{{ transfer.fromIsin }}</span>
                        <button
                          class="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/10 transition-colors"
                          @click="copyIsin(transfer.fromIsin, `0-${tIndex}-from`)"
                        >
                          <Check
                            v-if="copiedKey === `0-${tIndex}-from`"
                            class="size-3 text-green-500"
                          />
                          <Copy
                            v-else
                            :class="cn('size-3', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')"
                          />
                        </button>
                      </span>
                    </div>
                  </div>

                  <ArrowRightLeft :class="cn('size-4 shrink-0 hidden sm:block', transfer.done ? 'text-muted-foreground/30' : 'text-muted-foreground')" />

                  <div class="flex items-center gap-2 min-w-0 sm:flex-1">
                    <Badge
                      :class="cn('shrink-0', transfer.done ? 'bg-muted text-muted-foreground/60 hover:bg-muted' : 'bg-green-800 text-white hover:bg-green-800/80')"
                    >
                      <TrendingUp class="size-3 mr-1" />
                      Destino
                    </Badge>
                    <div class="flex flex-col min-w-0">
                      <span :class="cn('text-sm font-medium truncate', transfer.done ? 'text-muted-foreground/50' : 'text-green-800 dark:text-green-400')">{{ transfer.toName }}</span>
                      <span class="inline-flex items-center gap-1">
                        <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-green-700/70 dark:text-green-500/70')">{{ transfer.toIsin }}</span>
                        <button
                          class="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/10 transition-colors"
                          @click="copyIsin(transfer.toIsin, `0-${tIndex}-to`)"
                        >
                          <Check
                            v-if="copiedKey === `0-${tIndex}-to`"
                            class="size-3 text-green-500"
                          />
                          <Copy
                            v-else
                            :class="cn('size-3', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')"
                          />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>

                <div class="text-right shrink-0 hidden sm:block">
                  <span :class="cn('text-lg font-semibold tabular-nums', transfer.done && 'text-muted-foreground/50')">
                    {{ formatCurrency(transfer.amount) }}
                  </span>
                </div>
              </div>
            </div>
          </template>

          <!-- Multiple DCA parts: collapsible groups -->
          <template v-else>
            <div
              v-for="(part, partIndex) in dcaTransfers"
              :key="partIndex"
              class="flex flex-col gap-0 rounded-lg border overflow-hidden"
            >
              <!-- Part header (clickable to collapse) -->
              <button
                class="flex flex-col gap-2 p-4 pb-3 w-full text-left hover:bg-muted/50 transition-colors"
                @click="togglePartCollapsed(partIndex)"
              >
                <div class="flex items-center gap-3 w-full">
                  <component
                    :is="collapsedParts.has(partIndex) ? ChevronRight : ChevronDown"
                    class="size-4 shrink-0 text-muted-foreground"
                  />
                  <div class="flex items-center gap-2 flex-1 min-w-0">
                    <span class="font-semibold">
                      Parte {{ partIndex + 1 }} de {{ dcaTransfers.length }}
                    </span>
                    <Badge
                      v-if="isPartComplete(part)"
                      class="bg-green-800 text-white hover:bg-green-800/80"
                    >
                      <Check class="size-3 mr-1" />
                      Completada
                    </Badge>
                    <Badge
                      v-else
                      variant="secondary"
                    >
                      {{ partProgress(part).done }}/{{ partProgress(part).total }}
                    </Badge>
                  </div>
                  <span class="text-sm font-medium tabular-nums text-muted-foreground">
                    {{ formatCurrency(part.reduce((sum, t) => sum + t.amount, 0)) }}
                  </span>
                </div>
                <Progress
                  :modelValue="partProgress(part).total > 0 ? Math.round((partProgress(part).done / partProgress(part).total) * 100) : 0"
                  class="h-1.5"
                />
              </button>

              <!-- Part transfers -->
              <div
                v-if="!collapsedParts.has(partIndex)"
                class="flex flex-col gap-3 mt-2 p-3 sm:p-4 pt-0 sm:pt-0"
              >
                <div
                  v-for="(transfer, tIndex) in part"
                  :key="tIndex"
                  :class="cn(
                    'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all duration-200',
                    transfer.done
                      ? 'bg-muted/10 border-muted text-muted-foreground/50'
                      : 'bg-muted/30',
                  )"
                >
                  <div class="flex items-center gap-3 sm:gap-4">
                    <Checkbox
                      v-model="transfer.done"
                      class="size-5 shrink-0"
                    />
                    <div
                      :class="cn(
                        'flex items-center justify-center size-8 rounded-full text-sm font-semibold shrink-0',
                        transfer.done
                          ? 'bg-muted/30 text-muted-foreground/50'
                          : 'bg-primary/10 text-primary',
                      )"
                    >
                      {{ tIndex + 1 }}
                    </div>
                    <span :class="cn('text-lg font-semibold tabular-nums sm:hidden', transfer.done && 'text-muted-foreground/50')">
                      {{ formatCurrency(transfer.amount) }}
                    </span>
                  </div>

                  <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 pl-11 sm:pl-0">
                    <div class="flex items-center gap-2 min-w-0 sm:flex-1">
                      <Badge
                        :variant="transfer.done ? undefined : 'destructive'"
                        :class="cn('shrink-0', transfer.done && 'bg-muted text-muted-foreground/60 hover:bg-muted')"
                      >
                        <TrendingDown class="size-3 mr-1" />
                        Origen
                      </Badge>
                      <div class="flex flex-col min-w-0">
                        <span :class="cn('text-sm font-medium truncate', transfer.done && 'text-muted-foreground/50')">{{ transfer.fromName }}</span>
                        <span class="inline-flex items-center gap-1">
                          <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')">{{ transfer.fromIsin }}</span>
                          <button
                            class="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/10 transition-colors"
                            @click.stop="copyIsin(transfer.fromIsin, `${partIndex}-${tIndex}-from`)"
                          >
                            <Check
                              v-if="copiedKey === `${partIndex}-${tIndex}-from`"
                              class="size-3 text-green-500"
                            />
                            <Copy
                              v-else
                              :class="cn('size-3', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')"
                            />
                          </button>
                        </span>
                      </div>
                    </div>

                    <ArrowRightLeft :class="cn('size-4 shrink-0 hidden sm:block', transfer.done ? 'text-muted-foreground/30' : 'text-muted-foreground')" />

                    <div class="flex items-center gap-2 min-w-0 sm:flex-1">
                      <Badge
                        :class="cn('shrink-0', transfer.done ? 'bg-muted text-muted-foreground/60 hover:bg-muted' : 'bg-green-800 text-white hover:bg-green-800/80')"
                      >
                        <TrendingUp class="size-3 mr-1" />
                        Destino
                      </Badge>
                      <div class="flex flex-col min-w-0">
                        <span :class="cn('text-sm font-medium truncate', transfer.done ? 'text-muted-foreground/50' : 'text-green-800 dark:text-green-400')">{{ transfer.toName }}</span>
                        <span class="inline-flex items-center gap-1">
                          <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-green-700/70 dark:text-green-500/70')">{{ transfer.toIsin }}</span>
                          <button
                            class="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/10 transition-colors"
                            @click.stop="copyIsin(transfer.toIsin, `${partIndex}-${tIndex}-to`)"
                          >
                            <Check
                              v-if="copiedKey === `${partIndex}-${tIndex}-to`"
                              class="size-3 text-green-500"
                            />
                            <Copy
                              v-else
                              :class="cn('size-3', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')"
                            />
                          </button>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="text-right shrink-0 hidden sm:block">
                    <span :class="cn('text-lg font-semibold tabular-nums', transfer.done && 'text-muted-foreground/50')">
                      {{ formatCurrency(transfer.amount) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center py-8 text-muted-foreground"
        >
          <ArrowRightLeft class="size-8 mb-2" />
          <p class="text-sm">
            No se necesitan traspasos.
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
