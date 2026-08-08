<script setup lang="ts">
import { PAGE_NAMES } from '~/pages/routeNames'
import InputCard from '~/components/calculators/sp500-calculator/InputCard.vue'
import ResultsChartCard from '~/components/calculators/sp500-calculator/ResultsChartCard.vue'

definePageMeta({
  name: PAGE_NAMES.CALCULATORS.SP500,
  breadcrumb: [
    { labelKey: 'layout.breadcrumb.home', to: { name: PAGE_NAMES.INDEX } },
    { labelKey: 'tools.sp500.navTitle' },
  ],
})

useSP500Calculator()
</script>

<template>
  <div class="flex flex-col gap-6 p-3 sm:p-6 max-w-7xl mx-auto">
    <ToolPageHeader :title="$t('tools.sp500.title')">
      {{ $t('sp500.intro') }}
    </ToolPageHeader>

    <InputCard />
    <ResultsChartCard />
  </div>
</template>
