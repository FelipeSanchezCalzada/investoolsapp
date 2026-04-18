<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldInput,
} from '@/components/ui/number-field'
import type { Workspace } from '~/db/types'
import useFrontDB from '~/db/useFrontDB'

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
            locale="es-ES"
            :formatOptions="{ style: 'currency', currency: 'USD' }"
          >
            <NumberFieldContent>
              <NumberFieldInput />
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
            locale="es-ES"
            :formatOptions="{ style: 'currency', currency: 'USD' }"
          >
            <NumberFieldContent>
              <NumberFieldInput />
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
</template>
