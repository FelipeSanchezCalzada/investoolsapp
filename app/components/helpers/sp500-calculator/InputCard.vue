<script setup lang="ts">
import { Calculator } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import type { Workspace } from '~/db/types'
import useFrontDB from '~/db/useFrontDB'

const emit = defineEmits<{
  calculate: []
}>()

defineProps<{
  isCalculating: boolean
}>()

const { selectedWorkspace } = storeToRefs(useFrontDB())

type SP500Calculator = NonNullable<Workspace['sp500Calculator']>

const calculator = computed<SP500Calculator | null>(() =>
  selectedWorkspace.value?.sp500Calculator ?? null,
)

const initialAmount = computed({
  get: () => calculator.value?.initialAmount ?? 0,
  set: (v) => {
    if (calculator.value) calculator.value.initialAmount = v
  },
})

const monthlyDCA = computed({
  get: () => calculator.value?.monthlyDCA ?? 0,
  set: (v) => {
    if (calculator.value) calculator.value.monthlyDCA = v
  },
})

const years = computed({
  get: () => calculator.value?.years ?? 10,
  set: (v) => {
    if (calculator.value) calculator.value.years = v
  },
})

const canCalculate = computed(() =>
  (initialAmount.value > 0 || monthlyDCA.value > 0) && years.value > 0,
)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">
        Datos de inversión
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div class="flex flex-col gap-2">
          <label
            for="initial-amount"
            class="text-sm font-medium"
          >
            Monto inicial
          </label>
          <NumberField
            id="initial-amount"
            v-model="initialAmount"
            :min="0"
            :step="100"
            :formatOptions="{ style: 'currency', currency: 'EUR' }"
          >
            <NumberFieldContent>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldContent>
          </NumberField>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="monthly-dca"
            class="text-sm font-medium"
          >
            DCA mensual
          </label>
          <NumberField
            id="monthly-dca"
            v-model="monthlyDCA"
            :min="0"
            :step="50"
            :formatOptions="{ style: 'currency', currency: 'EUR' }"
          >
            <NumberFieldContent>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldContent>
          </NumberField>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="years"
            class="text-sm font-medium"
          >
            Horizonte temporal (años)
          </label>
          <NumberField
            id="years"
            v-model="years"
            :min="1"
            :max="50"
            :step="1"
          >
            <NumberFieldContent>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldContent>
          </NumberField>
        </div>
      </div>

      <div class="flex justify-center mt-6">
        <Button
          size="lg"
          :disabled="!canCalculate || isCalculating"
          @click="emit('calculate')"
        >
          <Calculator class="size-4 mr-2" />
          {{ isCalculating ? 'Calculando...' : 'Calcular' }}
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
