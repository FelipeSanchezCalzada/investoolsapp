<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import useFrontDB from '~/db/useFrontDB'

const store = useFrontDB()
const { selectedWorkspace } = storeToRefs(store)

const calculator = computed(() =>
  selectedWorkspace.value?.financialFreedomCalculator ?? null,
)

const expenses = computed(() => calculator.value?.expenses ?? [])

const initialAmount = computed({
  get: () => calculator.value?.initialAmount ?? 0,
  set: (v) => {
    if (selectedWorkspace.value?.financialFreedomCalculator)
      selectedWorkspace.value.financialFreedomCalculator.initialAmount = v
  },
})

const monthlyDCA = computed({
  get: () => calculator.value?.monthlyDCA ?? 0,
  set: (v) => {
    if (selectedWorkspace.value?.financialFreedomCalculator)
      selectedWorkspace.value.financialFreedomCalculator.monthlyDCA = v
  },
})

const currentAge = computed({
  get: () => calculator.value?.currentAge ?? 30,
  set: (v) => {
    if (selectedWorkspace.value?.financialFreedomCalculator)
      selectedWorkspace.value.financialFreedomCalculator.currentAge = v
  },
})

const maxAge = computed({
  get: () => calculator.value?.maxAge ?? 85,
  set: (v) => {
    if (selectedWorkspace.value?.financialFreedomCalculator)
      selectedWorkspace.value.financialFreedomCalculator.maxAge = v
  },
})

function addExpense() {
  const calc = selectedWorkspace.value?.financialFreedomCalculator
  if (!calc) return
  calc.expenses.push({
    id: crypto.randomUUID(),
    name: '',
    monthlyAmount: 0,
    fromYear: 0,
    toYear: null,
    fromFinancialFreedom: false,
  })
}

function removeExpense(id: string) {
  const calc = selectedWorkspace.value?.financialFreedomCalculator
  if (!calc) return
  const idx = calc.expenses.findIndex(e => e.id === id)
  if (idx !== -1) calc.expenses.splice(idx, 1)
}

function toggleFromFinancialFreedom(id: string, checked: boolean) {
  const calc = selectedWorkspace.value?.financialFreedomCalculator
  if (!calc) return
  const expenseIndex = calc.expenses.findIndex(e => e.id === id)
  if (expenseIndex !== -1) {
    calc.expenses[expenseIndex]!.fromFinancialFreedom = checked
    calc.expenses[expenseIndex]!.fromYear = 0
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">
        Datos de inversión
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div class="flex flex-col gap-2">
          <label
            for="ff-initial-amount"
            class="text-sm font-medium"
          >
            Monto inicial ($)
          </label>
          <NumberField
            id="ff-initial-amount"
            v-model="initialAmount"
            :min="0"
            :step="1000"
            locale="es-ES"
            :formatOptions="{ maximumFractionDigits: 2 }"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="ff-monthly-dca"
            class="text-sm font-medium"
          >
            Aportación mensual ($)
          </label>
          <NumberField
            id="ff-monthly-dca"
            v-model="monthlyDCA"
            :min="0"
            :step="50"
            locale="es-ES"
            :formatOptions="{ maximumFractionDigits: 2 }"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="ff-current-age"
            class="text-sm font-medium"
          >
            Edad actual
          </label>
          <NumberField
            id="ff-current-age"
            v-model="currentAge"
            :min="1"
            :max="100"
            :step="1"
            locale="es-ES"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="ff-max-age"
            class="text-sm font-medium"
          >
            Edad máxima
          </label>
          <NumberField
            id="ff-max-age"
            v-model="maxAge"
            :min="1"
            :max="120"
            :step="1"
            locale="es-ES"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>
      </div>
    </CardContent>
  </Card>

  <Card>
    <CardHeader class="flex flex-row items-center justify-between">
      <CardTitle class="text-lg">
        Gastos futuros
      </CardTitle>
      <Button
        size="sm"
        variant="outline"
        @click="addExpense"
      >
        <Plus class="size-4 mr-1" />
        Añadir gasto
      </Button>
    </CardHeader>
    <CardContent>
      <div
        v-if="!expenses.length"
        class="text-center py-8 text-muted-foreground"
      >
        No hay gastos configurados. Añade gastos para calcular tu libertad financiera.
      </div>

      <Table v-else>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead class="w-50">
              Gasto mensual ($)
            </TableHead>
            <TableHead class="w-30">
              Desde Libertad
            </TableHead>
            <TableHead class="w-36">
              Desde año
            </TableHead>
            <TableHead class="w-36">
              Hasta año
            </TableHead>
            <TableHead class="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="expense in expenses"
            :key="expense.id"
          >
            <TableCell>
              <input
                v-model="expense.name"
                type="text"
                placeholder="Ej: Alquiler pueblo"
                class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
            </TableCell>
            <TableCell>
              <NumberField
                v-model="expense.monthlyAmount"
                :min="0"
                :step="50"
                locale="es-ES"
                :formatOptions="{ maximumFractionDigits: 2 }"
              >
                <NumberFieldContent>
                  <NumberFieldInput />
                </NumberFieldContent>
              </NumberField>
            </TableCell>
            <TableCell class="text-center">
              <Checkbox
                :id="`ff-checkbox-${expense.id}`"
                :modelValue="expense.fromFinancialFreedom"
                @update:modelValue="(v) => toggleFromFinancialFreedom(expense.id, !!v)"
              />
            </TableCell>
            <TableCell>
              <div :class="expense.fromFinancialFreedom ? 'opacity-50 pointer-events-none' : ''">
                <NumberField
                  v-model="expense.fromYear"
                  :min="0"
                  :max="99"
                  :step="1"
                  locale="es-ES"
                >
                  <NumberFieldContent>
                    <NumberFieldInput />
                  </NumberFieldContent>
                </NumberField>
              </div>
            </TableCell>
            <TableCell>
              <NumberField
                v-model="expense.toYear"
                :min="0"
                :max="99"
                :step="1"
                locale="es-ES"
              >
                <NumberFieldContent>
                  <NumberFieldInput />
                </NumberFieldContent>
              </NumberField>
            </TableCell>
            <TableCell>
              <Button
                size="icon"
                variant="ghost"
                class="text-destructive hover:text-destructive"
                @click="removeExpense(expense.id)"
              >
                <Trash2 class="size-4" />
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </CardContent>
  </Card>
</template>
