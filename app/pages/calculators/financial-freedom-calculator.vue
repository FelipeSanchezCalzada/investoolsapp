<script setup lang="ts">
import { PAGE_NAMES } from '~/pages/routeNames'
import InputCard from '~/components/calculators/financial-freedom-calculator/InputCard.vue'
import ResultsChartCard from '~/components/calculators/financial-freedom-calculator/ResultsChartCard.vue'

definePageMeta({
  name: PAGE_NAMES.CALCULATORS.FINANCIAL_FREEDOM,
  breadcrumb: [
    { label: 'Home', to: { name: PAGE_NAMES.INDEX } },
    { label: 'Calculadora Libertad Financiera' },
  ],
})

useFinancialFreedomCalculator()
</script>

<template>
  <div class="flex flex-col gap-6 p-3 sm:p-6 max-w-7xl mx-auto">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Calculadora de Libertad Financiera
      </h1>
      <p class="text-muted-foreground mt-1">
        Calcula cuantos años necesitas seguir aportando para poder vivir solo de las ganancias del S&P 500,
        teniendo en cuenta tus gastos futuros. Basado en datos historicos desde 1927.
      </p>
    </div>

    <InputCard />
    <ResultsChartCard />
  </div>
</template>
