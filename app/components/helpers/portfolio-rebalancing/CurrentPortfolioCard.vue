<script setup lang="ts">
import { Plus, Trash2, GripVertical } from 'lucide-vue-next'
import draggable from 'vuedraggable'
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
type CurrentFund = PortfolioRebalancingHelper['current'][number]

const browserLocale = 'es-ES'

const { selectedWorkspace } = storeToRefs(useFrontDB())

const currentFunds = computed<CurrentFund[]>({
  get: () => selectedWorkspace.value?.portfolioRebalancingHelper?.current ?? [],
  set: (val) => {
    if (selectedWorkspace.value?.portfolioRebalancingHelper) {
      selectedWorkspace.value.portfolioRebalancingHelper.current = val
    }
  },
})

const totalCurrentAmount = computed(() =>
  currentFunds.value.reduce((sum, f) => sum + (f.amount || 0), 0),
)

function getCurrentPercentage(fund: CurrentFund): number {
  if (totalCurrentAmount.value === 0) return 0
  return (fund.amount / totalCurrentAmount.value) * 100
}

function addCurrentFund() {
  currentFunds.value.push({
    id: crypto.randomUUID(),
    name: '',
    isin: '',
    amount: 0,
  })
}

function removeCurrentFund(id: string) {
  const idx = currentFunds.value.findIndex(f => f.id === id)
  if (idx !== -1) currentFunds.value.splice(idx, 1)
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
        v-if="currentFunds.length > 0"
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
            v-model="currentFunds"
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
                      <NumberFieldInput />
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
        v-if="currentFunds.length > 0"
        v-model="currentFunds"
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
                    <NumberFieldInput />
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
        v-if="currentFunds.length === 0"
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
</template>
