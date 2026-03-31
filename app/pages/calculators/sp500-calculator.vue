<script setup lang="ts">
import { PAGE_NAMES } from '~/pages/routeNames'
import type { Workspace } from '~/db/types'
import useFrontDB from '~/db/useFrontDB'
import InputCard from '~/components/calculators/sp500-calculator/InputCard.vue'
import ResultsChartCard from '~/components/calculators/sp500-calculator/ResultsChartCard.vue'

definePageMeta({
  name: PAGE_NAMES.CALCULATORS.SP500,
  breadcrumb: [
    { label: 'Home', to: { name: PAGE_NAMES.INDEX } },
    { label: 'Calculadora S&P 500' },
  ],
})

const { selectedWorkspace } = storeToRefs(useFrontDB())

function ensureCalculatorData(ws: Workspace) {
  if (!ws.sp500Calculator) {
    ws.sp500Calculator = {
      initialAmount: 10000,
      monthlyDCA: 500,
      years: 10,
    }
  }
}

watchImmediate(selectedWorkspace, (ws) => {
  if (ws) {
    ensureCalculatorData(ws)
  }
})

const { loadData, calculate, isLoading, results } = useSP500Calculator()

onMounted(async () => {
  await loadData()
  const calc = selectedWorkspace.value?.sp500Calculator
  if (calc && (calc.initialAmount > 0 || calc.monthlyDCA > 0) && calc.years > 0) {
    onCalculate()
  }
})

function onCalculate() {
  const calc = selectedWorkspace.value?.sp500Calculator
  if (!calc) return
  calculate(calc.initialAmount, calc.monthlyDCA, calc.years)
}
</script>

<template>
  <div class="flex flex-col gap-6 p-3 sm:p-6 max-w-7xl mx-auto">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Calculadora S&P 500
      </h1>
      <p class="text-muted-foreground mt-1">
        Simula tu inversión con DCA usando datos históricos del S&P 500 para ver el mejor, peor y caso actual.
        Esta herramienta funciona con datos históricos desde el año 1927 del S&P 500. Los valores son en dólares (USD).
        No importa que tu trabajes en otras divisa, esta herramienta es solo una estimation.
      </p>
    </div>

    <InputCard
      :isCalculating="isLoading"
      @calculate="onCalculate"
    />
    <ResultsChartCard
      :isCalculating="isLoading"
      :results="results"
    />
  </div>
</template>
