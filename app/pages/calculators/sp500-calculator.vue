<script setup lang="ts">
import { PAGE_NAMES } from '~/pages/routeNames'
import InputCard from '~/components/calculators/sp500-calculator/InputCard.vue'
import ResultsChartCard from '~/components/calculators/sp500-calculator/ResultsChartCard.vue'

definePageMeta({
  name: PAGE_NAMES.CALCULATORS.SP500,
  breadcrumb: [
    { label: 'Home', to: { name: PAGE_NAMES.INDEX } },
    { label: 'Calculadora S&P 500' },
  ],
})

useSP500Calculator()
</script>

<template>
  <div class="flex flex-col gap-6 p-3 sm:p-6 max-w-7xl mx-auto">
    <ToolPageHeader title="Calculadora S&P 500">
      Simula tu inversión con DCA usando datos históricos del S&P 500 para ver el mejor, peor y caso actual.
      Esta herramienta funciona con datos históricos desde el año 1927 del S&P 500. Los valores son en dólares (USD).
      No importa que tu trabajes en otras divisa, esta herramienta es solo una estimation.
    </ToolPageHeader>

    <InputCard />
    <ResultsChartCard />
  </div>
</template>
