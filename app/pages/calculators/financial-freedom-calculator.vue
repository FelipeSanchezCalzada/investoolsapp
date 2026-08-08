<script setup lang="ts">
import { PAGE_NAMES } from '~/pages/routeNames'
import InputCard from '~/components/calculators/financial-freedom-calculator/InputCard.vue'
import ResultsChartCard from '~/components/calculators/financial-freedom-calculator/ResultsChartCard.vue'

definePageMeta({
  name: PAGE_NAMES.CALCULATORS.FINANCIAL_FREEDOM,
  breadcrumb: [
    { labelKey: 'layout.breadcrumb.home', to: { name: PAGE_NAMES.INDEX } },
    { labelKey: 'tools.financialFreedom.breadcrumb' },
  ],
})

useFinancialFreedomCalculator()
</script>

<template>
  <div class="flex flex-col gap-6 p-3 sm:p-6 max-w-7xl mx-auto">
    <ToolPageHeader :title="$t('tools.financialFreedom.title')">
      {{ $t('financialFreedom.intro') }}
    </ToolPageHeader>

    <InputCard />
    <ResultsChartCard />
  </div>
</template>
