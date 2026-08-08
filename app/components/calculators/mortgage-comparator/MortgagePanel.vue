<script setup lang="ts">
import { ChevronDown, TriangleAlert } from '@lucide/vue'
import type { Mortgage } from '~/db/types/FrontDBv3'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import BindingsEditor from '~/components/calculators/mortgage-comparator/BindingsEditor.vue'
import MortgageConditionsCard from '~/components/calculators/mortgage-comparator/MortgageConditionsCard.vue'
import MortgageCostsCard from '~/components/calculators/mortgage-comparator/MortgageCostsCard.vue'
import MortgageSummaryCard from '~/components/calculators/mortgage-comparator/MortgageSummaryCard.vue'
import OpportunityCostCard from '~/components/calculators/mortgage-comparator/OpportunityCostCard.vue'
import PrepaymentsEditor from '~/components/calculators/mortgage-comparator/PrepaymentsEditor.vue'
import { formatCompactCurrency, formatPercent, formatPp } from '~/composables/useMortgageComparator'

const props = defineProps<{ mortgage: Mortgage }>()

const { common, resultFor } = useMortgageComparator()
const { t } = useI18n()

const result = computed(() => resultFor(props.mortgage.id))

const openSections = ref({
  conditions: true,
  costs: false,
  bindings: true,
  prepayments: false,
  opportunity: false,
})

const conditionsSummary = computed(() => {
  const mortgage = props.mortgage
  const rate = mortgage.rateType === 'fixed'
    ? formatPercent(mortgage.fixedRatePct)
    : mortgage.rateType === 'mixed'
      ? t('mortgage.panel.conditionsMixed', {
          rate: formatPercent(mortgage.fixedRatePct),
          years: Math.round(mortgage.mixedFixedMonths / 12),
          spread: formatPercent(mortgage.spreadPct, ''),
        })
      : t('mortgage.panel.conditionsVariable', { spread: formatPercent(mortgage.spreadPct, '') })

  const principal = result.value?.principal ?? mortgage.principal ?? common.value?.principal ?? 0
  const months = result.value?.termMonths ?? mortgage.termMonths ?? common.value?.termMonths ?? 0

  return [
    t(`mortgage.conditions.rateTypes.${mortgage.rateType}`),
    rate,
    formatCompactCurrency(principal),
    t('common.yearsCount', { count: Math.round(months / 12) }),
  ].join(' · ')
})

const costsSummary = computed(() => {
  const current = result.value
  if (!current) return t('common.emptyValue')
  return t('mortgage.panel.costsSummary', {
    upfront: formatCompactCurrency(current.clientUpfrontCost),
    openingFee: formatPercent(props.mortgage.upfrontCosts.openingFeePct),
  })
})

const bindingsSummary = computed(() => {
  const active = props.mortgage.bindings.filter(binding => binding.active)
  if (!active.length) return t('common.none')
  const bonus = active.reduce((sum, binding) => sum + binding.rateReductionPp, 0)
  const current = result.value
  const perYear = current && current.years > 0 ? current.totalBindingNetCost / current.years : null
  const cost = perYear === null
    ? ''
    : t('mortgage.panel.bindingsCost', { value: formatCompactCurrency(perYear) })
  return t('mortgage.panel.bindingsSummary', { count: active.length, bonus: formatPp(bonus), cost }, active.length)
})

const prepaymentsSummary = computed(() => {
  const prepayments = props.mortgage.prepayments
  if (!prepayments.length) return t('common.none')
  const total = prepayments.reduce((sum, prepayment) => sum + prepayment.amount, 0)
  const savings = result.value?.prepaymentInterestSavings ?? null
  const saving = savings === null
    ? ''
    : t('mortgage.panel.prepaymentsSaving', { value: formatCompactCurrency(savings) })
  return t('mortgage.panel.prepaymentsSummary', {
    count: prepayments.length,
    total: formatCompactCurrency(total),
    saving,
  }, prepayments.length)
})

const opportunitySummary = computed(() => {
  if (!common.value?.opportunityCostEnabled) return t('mortgage.panel.disabled')
  const opportunity = result.value?.opportunityCost
  if (!opportunity) return t('common.emptyValue')
  return t('mortgage.panel.opportunitySummary', {
    downPayment: formatCompactCurrency(opportunity.downPayment),
    freeCapital: formatCompactCurrency(opportunity.freeCapital),
    netPortfolio: formatCompactCurrency(opportunity.netPortfolio),
  })
})

const sections = computed(() => [
  { key: 'conditions' as const, title: t('mortgage.panel.conditions'), summary: conditionsSummary.value },
  { key: 'costs' as const, title: t('mortgage.panel.costs'), summary: costsSummary.value },
  { key: 'bindings' as const, title: t('mortgage.panel.bindings'), summary: bindingsSummary.value },
  { key: 'prepayments' as const, title: t('mortgage.panel.prepayments'), summary: prepaymentsSummary.value },
  { key: 'opportunity' as const, title: t('mortgage.panel.opportunity'), summary: opportunitySummary.value },
])
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="result?.warnings.length"
      class="flex flex-col gap-1 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
    >
      <p
        v-for="warning in result.warnings"
        :key="warning.key"
        class="flex items-start gap-2 text-sm"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-500" />
        {{ $t(warning.key, warning.params ?? {}) }}
      </p>
    </div>

    <Card
      v-for="section in sections"
      :key="section.key"
      class="py-0"
    >
      <Collapsible v-model:open="openSections[section.key]">
        <CollapsibleTrigger
          class="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
        >
          <ChevronDown
            :class="cn(
              'size-4 shrink-0 text-muted-foreground transition-transform',
              openSections[section.key] && 'rotate-180',
            )"
          />
          <span class="shrink-0 text-sm font-semibold">{{ section.title }}</span>
          <span class="ml-auto hidden min-w-0 truncate text-xs text-muted-foreground sm:inline">
            {{ section.summary }}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent class="border-t px-4 py-4">
            <MortgageConditionsCard
              v-if="section.key === 'conditions'"
              :mortgageId="mortgage.id"
            />
            <MortgageCostsCard
              v-else-if="section.key === 'costs'"
              :mortgageId="mortgage.id"
            />
            <BindingsEditor
              v-else-if="section.key === 'bindings'"
              :mortgageId="mortgage.id"
              :result="result"
            />
            <PrepaymentsEditor
              v-else-if="section.key === 'prepayments'"
              :mortgageId="mortgage.id"
              :result="result"
            />
            <OpportunityCostCard
              v-else
              :result="result"
            />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>

    <MortgageSummaryCard :result="result" />
  </div>
</template>
