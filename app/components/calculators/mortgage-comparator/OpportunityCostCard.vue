<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import type { MortgageResult } from '~/lib/mortgage/calculate'
import { formatCurrency, formatPercent } from '~/composables/useMortgageComparator'

defineProps<{ result: MortgageResult | null }>()

const { common } = useMortgageComparator()
</script>

<template>
  <div
    v-if="!result"
    class="text-sm text-muted-foreground"
  >
    {{ $t('mortgage.opportunity.noData') }}
  </div>

  <div
    v-else-if="!common?.opportunityCostEnabled"
    class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
  >
    {{ $t('mortgage.opportunity.disabled') }}
  </div>

  <div
    v-else
    class="flex flex-col gap-4"
  >
    <p class="text-xs text-muted-foreground">
      {{ $t('mortgage.opportunity.intro', {
        returnPct: formatPercent(common.expectedReturnPct),
        years: result.years,
        taxPct: formatPercent(common.capitalGainsTaxPct),
      }) }}
    </p>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-lg border bg-muted/40 p-3">
        <p class="text-xs text-muted-foreground">
          {{ $t('mortgage.opportunity.downPayment') }}
        </p>
        <p class="text-lg font-semibold tracking-tight">
          {{ formatCurrency(result.opportunityCost.downPayment) }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ $t('mortgage.opportunity.downPaymentHint') }}
        </p>
      </div>

      <div class="rounded-lg border bg-muted/40 p-3">
        <p class="text-xs text-muted-foreground">
          {{ $t('mortgage.opportunity.freeCapital') }}
        </p>
        <p class="text-lg font-semibold tracking-tight">
          {{ formatCurrency(result.opportunityCost.freeCapital) }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ $t('mortgage.opportunity.freeCapitalHint') }}
        </p>
      </div>

      <div class="rounded-lg border bg-muted/40 p-3">
        <p class="text-xs text-muted-foreground">
          {{ $t('mortgage.opportunity.netPortfolio') }}
        </p>
        <p class="text-lg font-semibold tracking-tight">
          {{ formatCurrency(result.opportunityCost.netPortfolio) }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ $t('mortgage.opportunity.taxHint', { value: formatCurrency(result.opportunityCost.capitalGainsTax) }) }}
        </p>
      </div>

      <div class="rounded-lg border border-primary/40 bg-primary/5 p-3">
        <p class="text-xs text-muted-foreground">
          {{ $t('mortgage.opportunity.netWorth') }}
        </p>
        <p
          class="text-lg font-semibold tracking-tight"
          :class="result.netWorth < 0 ? 'text-red-600 dark:text-red-400' : ''"
        >
          {{ formatCurrency(result.netWorth) }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ $t('mortgage.opportunity.netWorthHint') }}
        </p>
      </div>
    </div>

    <div
      v-if="result.opportunityCost.notAffordable || result.opportunityCost.negativeDownPayment"
      class="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-500" />
      <span v-if="result.opportunityCost.negativeDownPayment">
        {{ $t('mortgage.opportunity.negativeDownPayment') }}
      </span>
      <span v-else>
        {{ $t('mortgage.opportunity.notAffordable', { value: formatCurrency(-result.opportunityCost.freeCapital) }) }}
      </span>
    </div>
  </div>
</template>
