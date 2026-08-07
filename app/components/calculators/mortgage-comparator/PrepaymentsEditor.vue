<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import type { MortgageResult } from '~/lib/mortgage/calculate'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldInput,
} from '@/components/ui/number-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { feeTierPct } from '~/lib/mortgage/amortization'
import { formatCurrency, formatPercent } from '~/composables/useMortgageComparator'

const props = defineProps<{ mortgageId: string, result: MortgageResult | null }>()

const { findMortgage } = useMortgageComparator()

/** The editors write straight into the store object, so only its id travels as a prop. */
const mortgage = computed(() => findMortgage(props.mortgageId))

const euroFormat = { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 } as const

function addPrepayment() {
  mortgage.value?.prepayments.push({
    id: crypto.randomUUID(),
    month: 12,
    amount: 5000,
    mode: 'reduceTerm',
    recurringEveryMonths: null,
  })
}

function removePrepayment(id: string) {
  const prepayments = mortgage.value?.prepayments
  if (!prepayments) return
  const index = prepayments.findIndex(prepayment => prepayment.id === id)
  if (index !== -1) prepayments.splice(index, 1)
}

function feePctFor(month: number, amount: number): number {
  const fees = mortgage.value?.earlyRepaymentFees
  if (!fees) return 0
  const yearIndex = Math.floor((month - 1) / 12)
  const outstanding = props.result?.simulation.schedule[month - 2]?.outstanding
  const isTotal = outstanding !== undefined && amount >= outstanding
  return feeTierPct(isTotal ? fees.total : fees.partial, yearIndex)
}

/** Fees paid for every prepayment of this mortgage. */
const totalFees = computed(() => {
  const result = props.result
  if (!result || !mortgage.value?.prepayments.length) return null
  return result.totalPrepaymentFees
})

function savingOf(prepaymentId: string): number | null {
  return props.result?.prepaymentEffects.find(effect => effect.prepaymentId === prepaymentId)?.netSaving ?? null
}

function monthsSavedBy(prepaymentId: string): number | null {
  return props.result?.prepaymentEffects.find(effect => effect.prepaymentId === prepaymentId)?.monthsSaved ?? null
}
</script>

<template>
  <div
    v-if="mortgage"
    class="flex flex-col gap-3"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="max-w-2xl text-xs text-muted-foreground">
        Pagos puntuales o recurrentes. «Reducir plazo» mantiene la cuota y acorta el préstamo;
        «reducir cuota» mantiene el plazo y recalcula la cuota. La comisión aplicable sale de los
        tramos configurados en Gastos y comisiones.
      </p>
      <Button
        size="sm"
        variant="outline"
        @click="addPrepayment"
      >
        <Plus class="mr-1 size-4" />
        Añadir amortización
      </Button>
    </div>

    <div
      v-if="!mortgage.prepayments.length"
      class="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
    >
      Ninguna amortización anticipada configurada.
    </div>

    <div v-else>
      <Table class="min-w-4xl">
        <TableHeader>
          <TableRow>
            <TableHead class="w-28">
              Mes
            </TableHead>
            <TableHead class="w-44">
              Importe
            </TableHead>
            <TableHead class="w-48">
              Modo
            </TableHead>
            <TableHead class="w-56">
              Recurrencia (meses)
            </TableHead>
            <TableHead class="w-28 text-right">
              Comisión
            </TableHead>
            <TableHead class="w-40 text-right">
              Ahorro neto
            </TableHead>
            <TableHead class="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="prepayment in mortgage.prepayments"
            :key="prepayment.id"
          >
            <TableCell>
              <NumberField
                v-model="prepayment.month"
                :min="1"
                :max="600"
                :step="1"
                locale="es-ES"
              >
                <NumberFieldContent>
                  <NumberFieldInput />
                </NumberFieldContent>
              </NumberField>
            </TableCell>
            <TableCell>
              <NumberField
                v-model="prepayment.amount"
                :min="0"
                :step="1000"
                locale="es-ES"
                :formatOptions="euroFormat"
              >
                <NumberFieldContent>
                  <NumberFieldInput />
                </NumberFieldContent>
              </NumberField>
            </TableCell>
            <TableCell>
              <Select v-model="prepayment.mode">
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reduceTerm">
                    Reducir plazo
                  </SelectItem>
                  <SelectItem value="reduceInstallment">
                    Reducir cuota
                  </SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <Checkbox
                  :modelValue="prepayment.recurringEveryMonths !== null"
                  class="shrink-0"
                  @update:modelValue="(value) => prepayment.recurringEveryMonths = value ? 12 : null"
                />
                <NumberField
                  v-model="prepayment.recurringEveryMonths"
                  class="min-w-0 flex-1"
                  :min="1"
                  :max="120"
                  :step="1"
                  :disabled="prepayment.recurringEveryMonths === null"
                  locale="es-ES"
                >
                  <NumberFieldContent>
                    <NumberFieldInput placeholder="Único" />
                  </NumberFieldContent>
                </NumberField>
              </div>
            </TableCell>
            <TableCell class="text-right">
              {{ formatPercent(feePctFor(prepayment.month, prepayment.amount)) }}
            </TableCell>
            <TableCell class="text-right">
              <span
                v-if="savingOf(prepayment.id) !== null"
                :class="(savingOf(prepayment.id) ?? 0) > 0 ? 'font-medium text-green-600 dark:text-green-400' : ''"
              >
                {{ formatCurrency(savingOf(prepayment.id)) }}
              </span>
              <span v-else>—</span>
              <p
                v-if="prepayment.mode === 'reduceTerm' && monthsSavedBy(prepayment.id)"
                class="text-xs text-muted-foreground"
              >
                −{{ monthsSavedBy(prepayment.id) }} meses
              </p>
            </TableCell>
            <TableCell>
              <Button
                size="icon"
                variant="ghost"
                class="text-destructive hover:text-destructive"
                @click="removePrepayment(prepayment.id)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <p
      v-if="totalFees !== null"
      class="text-xs text-muted-foreground"
    >
      Intereses ahorrados en total: {{ formatCurrency(result?.prepaymentInterestSavings) }};
      comisiones pagadas: {{ formatCurrency(totalFees) }}.
      El préstamo se cancela en el mes {{ result?.simulation.months }} de {{ result?.termMonths }}.
    </p>
  </div>
</template>
