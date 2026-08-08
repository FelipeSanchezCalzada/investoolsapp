<script setup lang="ts">
import { Info } from '@lucide/vue'
import BindingsWorthItCard from '~/components/calculators/mortgage-comparator/BindingsWorthItCard.vue'
import ComparisonTableCard from '~/components/calculators/mortgage-comparator/ComparisonTableCard.vue'
import ResultsChartCard from '~/components/calculators/mortgage-comparator/ResultsChartCard.vue'
import SensitivityCard from '~/components/calculators/mortgage-comparator/SensitivityCard.vue'

const { mortgages } = useMortgageComparator()

const disabledCount = computed(() => mortgages.value.filter(mortgage => !mortgage.enabled).length)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="mortgages.length === 1"
      class="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm"
    >
      <Info class="mt-0.5 size-4 shrink-0 text-primary" />
      <span>
        {{ $t('mortgage.comparisonPanel.singleOffer') }}
      </span>
    </div>

    <p
      v-else-if="disabledCount"
      class="text-xs text-muted-foreground"
    >
      {{ $t('mortgage.comparisonPanel.disabledCount', { count: disabledCount }, disabledCount) }}
    </p>

    <ComparisonTableCard />
    <ResultsChartCard />
    <BindingsWorthItCard />
    <SensitivityCard />
  </div>
</template>
