<script setup lang="ts">
import { ChevronDown, Loader2 } from '@lucide/vue'
import type { MortgageResult } from '~/lib/mortgage/calculate'
import { cn } from '@/lib/utils'
import AmortizationTableDialog from '~/components/calculators/mortgage-comparator/AmortizationTableDialog.vue'
import { formatCurrency, formatPercent } from '~/composables/useMortgageComparator'

const props = defineProps<{ result: MortgageResult | null }>()

const { isLoading } = useMortgageComparator()
const { t } = useI18n()

const expandedOnMobile = ref(false)

const metrics = computed(() => {
  const result = props.result
  if (!result) return []
  return [
    { label: t('mortgage.summary.initialInstallment'), value: formatCurrency(result.initialInstallment), accent: false },
    { label: t('mortgage.summary.maxInstallment'), value: formatCurrency(result.maxInstallment), accent: false },
    { label: t('mortgage.summary.effectiveRate'), value: formatPercent(result.effectiveRatePct), accent: false },
    { label: t('mortgage.summary.realApr'), value: formatPercent(result.apr.realApr), accent: true },
    { label: t('mortgage.summary.totalCost'), value: formatCurrency(result.totalCost), accent: false },
    { label: t('mortgage.summary.netWorth'), value: formatCurrency(result.netWorth), accent: false },
  ]
})
</script>

<template>
  <div class="sticky bottom-0 z-20 -mx-3 border-t bg-background/95 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6 supports-[backdrop-filter]:bg-background/80">
    <!-- Mobile: one pressable line -->
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-left sm:hidden"
      @click="expandedOnMobile = !expandedOnMobile"
    >
      <span class="text-sm font-semibold">
        {{ $t('mortgage.summary.mobile', {
          installment: formatCurrency(result?.initialInstallment),
          apr: formatPercent(result?.apr.realApr),
        }) }}
      </span>
      <ChevronDown
        :class="cn('size-4 shrink-0 transition-transform', expandedOnMobile && 'rotate-180')"
      />
    </button>

    <div
      :class="cn(
        'mt-2 grid-cols-2 gap-2 sm:mt-0 sm:grid sm:grid-cols-3 lg:grid-cols-6',
        expandedOnMobile ? 'grid' : 'hidden',
      )"
    >
      <div
        v-for="metric in metrics"
        :key="metric.label"
        :class="cn(
          'rounded-lg border p-2',
          metric.accent ? 'border-primary/40 bg-primary/5' : 'bg-muted/40',
        )"
      >
        <p class="text-xs text-muted-foreground">
          {{ metric.label }}
        </p>
        <p class="text-base font-semibold tracking-tight">
          {{ metric.value }}
        </p>
      </div>
    </div>

    <div class="mt-2 flex flex-wrap items-center justify-between gap-2">
      <span
        v-if="isLoading"
        class="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <Loader2 class="size-3.5 animate-spin" />
        {{ $t('mortgage.summary.recalculating') }}
      </span>
      <span
        v-else-if="result"
        class="text-xs text-muted-foreground"
      >
        {{ $t('mortgage.summary.official', {
          official: formatPercent(result.apr.officialApr),
          without: formatPercent(result.apr.aprWithoutBindings),
        }) }}
      </span>
      <span v-else />

      <AmortizationTableDialog :result="result" />
    </div>
  </div>
</template>
