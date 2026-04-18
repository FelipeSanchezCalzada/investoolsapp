<script setup lang="ts">
import { Plus, Trash2, GripVertical, Copy, Check, ClipboardPaste } from 'lucide-vue-next'
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

const browserLocale = 'es-ES'

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
  return new Intl.NumberFormat('es-ES', {
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
    targetFunds.value.splice(0, targetFunds.value.length, ...funds)
    toast.success(`${funds.length} fondo${funds.length > 1 ? 's' : ''} pegado${funds.length > 1 ? 's' : ''}`)
  } catch {
    toast.error('No se pudo leer el portapapeles')
  }
}
</script>

<template>
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
        v-if="targetFunds.length > 0"
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
          v-if="targetFunds.length > 0 && !isTargetValid"
          class="text-sm text-destructive"
        >
          Los porcentajes deben sumar exactamente 100%.
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
</template>
