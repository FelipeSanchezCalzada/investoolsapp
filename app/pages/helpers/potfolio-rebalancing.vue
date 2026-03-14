<script setup lang="ts">
import { computed, reactive } from 'vue'
import { Plus, Trash2, ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-vue-next'
import { PAGE_NAMES } from '~/pages/routeNames'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

definePageMeta({
  name: PAGE_NAMES.HELPERS.PORTFOLIO_REBALANCING,
})

// --- Locale ---

const browserLocale = 'es-ES'

// --- Types ---

interface CurrentFund {
  id: string
  name: string
  isin: string
  amount: number
}

interface TargetFund {
  id: string
  name: string
  isin: string
  percentage: number
}

interface Transfer {
  fromName: string
  fromIsin: string
  toName: string
  toIsin: string
  amount: number
  done: boolean
}

// --- State (single object for future persistence) ---

const portfolio = reactive({
  current: [] as CurrentFund[],
  target: [] as TargetFund[],
})

// --- Computed ---

const totalCurrentAmount = computed(() =>
  portfolio.current.reduce((sum, f) => sum + (f.amount || 0), 0),
)

const totalTargetPercentage = computed(() =>
  portfolio.target.reduce((sum, f) => sum + (f.percentage || 0), 0),
)

const isTargetValid = computed(() =>
  Math.abs(totalTargetPercentage.value - 100) < 0.01,
)

const canCalculate = computed(() =>
  portfolio.current.length > 0
  && portfolio.target.length > 0
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
  portfolio.current.push({
    id: crypto.randomUUID(),
    name: '',
    isin: '',
    amount: 0,
  })
}

function removeCurrentFund(id: string) {
  const idx = portfolio.current.findIndex(f => f.id === id)
  if (idx !== -1) portfolio.current.splice(idx, 1)
}

function addTargetFund() {
  portfolio.target.push({
    id: crypto.randomUUID(),
    name: '',
    isin: '',
    percentage: 0,
  })
}

function removeTargetFund(id: string) {
  const idx = portfolio.target.findIndex(f => f.id === id)
  if (idx !== -1) portfolio.target.splice(idx, 1)
}

// --- Rebalancing algorithm ---

const transfers = ref<Transfer[]>([])
const hasCalculated = ref(false)

function calculateRebalancing() {
  if (!canCalculate.value) return

  const total = totalCurrentAmount.value

  // Build a map of ISIN -> { name, current amount, target amount }
  const fundMap = new Map<string, { name: string, current: number, target: number }>()

  for (const f of portfolio.current) {
    fundMap.set(f.isin, {
      name: f.name,
      current: f.amount,
      target: 0,
    })
  }

  for (const f of portfolio.target) {
    const targetAmount = total * (f.percentage / 100)
    if (fundMap.has(f.isin)) {
      fundMap.get(f.isin)!.target = targetAmount
      // Update name if changed in target
      if (f.name) fundMap.get(f.isin)!.name = f.name
    }
    else {
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
    }
    else if (diff > 0.01) {
      destinations.push({ isin, name: data.name, needed: diff })
    }
  }

  // Greedy matching: minimize number of transfers
  // Sort sources and destinations by amount descending for better matching
  sources.sort((a, b) => b.excess - a.excess)
  destinations.sort((a, b) => b.needed - a.needed)

  const result: Transfer[] = []
  let si = 0
  let di = 0

  while (si < sources.length && di < destinations.length) {
    const source = sources[si]!
    const dest = destinations[di]!
    const transferAmount = Math.min(source.excess, dest.needed)

    if (transferAmount > 0.01) {
      result.push({
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

  transfers.value = result
  hasCalculated.value = true
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
</script>

<template>
  <div class="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
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
        <Table v-if="portfolio.current.length > 0">
          <TableHeader>
            <TableRow>
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
          <TableBody>
            <TableRow
              v-for="fund in portfolio.current"
              :key="fund.id"
            >
              <TableCell>
                <Input
                  v-model="fund.name"
                  placeholder="Ej: Amundi MSCI World"
                  class="h-9"
                />
              </TableCell>
              <TableCell>
                <Input
                  v-model="fund.isin"
                  placeholder="Ej: LU1234567890"
                  class="h-9 font-mono"
                />
              </TableCell>
              <TableCell class="text-right">
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
              <TableCell class="text-right tabular-nums">
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
          </TableBody>
        </Table>

        <div
          v-else
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
        <Table v-if="portfolio.target.length > 0">
          <TableHeader>
            <TableRow>
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
          <TableBody>
            <TableRow
              v-for="fund in portfolio.target"
              :key="fund.id"
            >
              <TableCell>
                <Input
                  v-model="fund.name"
                  placeholder="Ej: Amundi MSCI World"
                  class="h-9"
                />
              </TableCell>
              <TableCell>
                <Input
                  v-model="fund.isin"
                  placeholder="Ej: LU1234567890"
                  class="h-9 font-mono"
                />
              </TableCell>
              <TableCell class="text-right">
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
              <TableCell class="text-right tabular-nums font-medium">
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
          </TableBody>
        </Table>

        <div
          v-else
          class="flex flex-col items-center justify-center py-8 text-muted-foreground"
        >
          <p class="text-sm">
            No hay fondos en la cartera objetivo.
          </p>
        </div>

        <div class="flex items-center gap-3 mt-4">
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
        </div>
      </CardContent>
    </Card>

    <!-- Calculate Button -->
    <div class="flex justify-center">
      <Button
        size="lg"
        :disabled="!canCalculate"
        @click="calculateRebalancing"
      >
        <ArrowRightLeft class="size-4 mr-2" />
        Calcular traspasos óptimos
      </Button>
    </div>

    <!-- Results -->
    <Card v-if="hasCalculated">
      <CardHeader>
        <CardTitle>Traspasos necesarios</CardTitle>
        <CardDescription>
          {{ transfers.length === 0
            ? 'Tu cartera ya está balanceada. No se necesitan traspasos.'
            : `Se necesitan ${transfers.length} traspaso${transfers.length > 1 ? 's' : ''} para rebalancear tu cartera.`
          }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          v-if="transfers.length > 0"
          class="flex flex-col gap-3"
        >
          <div
            v-for="(transfer, index) in transfers"
            :key="index"
            :class="cn(
              'flex items-center gap-4 p-4 rounded-lg border transition-all duration-200',
              transfer.done
                ? 'bg-muted/10 border-muted text-muted-foreground/50'
                : 'bg-muted/30',
            )"
          >
            <Checkbox
              :checked="transfer.done"
              class="size-5 shrink-0"
              @update:modelValue="(val) => transfer.done = !!val"
            />

            <div :class="cn(
              'flex items-center justify-center size-8 rounded-full text-sm font-semibold shrink-0',
              transfer.done
                ? 'bg-muted/30 text-muted-foreground/50'
                : 'bg-primary/10 text-primary',
            )">
              {{ index + 1 }}
            </div>

            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 flex-1 min-w-0">
              <!-- Source -->
              <div class="flex items-center gap-2 min-w-0">
                <Badge
                  :variant="transfer.done ? undefined : 'destructive'"
                  :class="cn(
                    'shrink-0',
                    transfer.done && 'bg-muted text-muted-foreground/60 hover:bg-muted',
                  )"
                >
                  <TrendingDown class="size-3 mr-1" />
                  Origen
                </Badge>
                <div class="flex flex-col min-w-0">
                  <span :class="cn('text-sm font-medium truncate', transfer.done && 'text-muted-foreground/50')">{{ transfer.fromName }}</span>
                  <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')">{{ transfer.fromIsin }}</span>
                </div>
              </div>

              <ArrowRightLeft :class="cn('size-4 shrink-0 hidden sm:block', transfer.done ? 'text-muted-foreground/30' : 'text-muted-foreground')" />

              <!-- Destination -->
              <div class="flex items-center gap-2 min-w-0">
                <Badge
                  :class="cn(
                    'shrink-0',
                    transfer.done
                      ? 'bg-muted text-muted-foreground/60 hover:bg-muted'
                      : 'bg-green-800 text-white hover:bg-green-800/80',
                  )"
                >
                  <TrendingUp class="size-3 mr-1" />
                  Destino
                </Badge>
                <div class="flex flex-col min-w-0">
                  <span :class="cn(
                    'text-sm font-medium truncate',
                    transfer.done
                      ? 'text-muted-foreground/50'
                      : 'text-green-800 dark:text-green-400',
                  )">{{ transfer.toName }}</span>
                  <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-green-700/70 dark:text-green-500/70')">{{ transfer.toIsin }}</span>
                </div>
              </div>
            </div>

            <div class="text-right shrink-0">
              <span :class="cn('text-lg font-semibold tabular-nums', transfer.done && 'text-muted-foreground/50')">
                {{ formatCurrency(transfer.amount) }}
              </span>
            </div>
          </div>
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
