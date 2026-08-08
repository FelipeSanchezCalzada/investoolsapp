<script setup lang="ts">
import { Info } from '@lucide/vue'
import { Switch } from '@/components/ui/switch'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldInput,
} from '@/components/ui/number-field'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatPercent } from '~/composables/useMortgageComparator'

const { locale } = useI18n()

const { common } = useMortgageComparator()

const amountFormat = { maximumFractionDigits: 0 } as const

const termYears = computed({
  get: () => Math.round((common.value?.termMonths ?? 0) / 12),
  set: (value) => {
    if (common.value) common.value.termMonths = Math.max(1, Math.round(value)) * 12
  },
})

const ltv = computed(() => {
  if (!common.value || common.value.appraisalValue <= 0) return null
  return (common.value.principal / common.value.appraisalValue) * 100
})
</script>

<template>
  <div
    v-if="common"
    class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3"
  >
    <div class="flex flex-col gap-2">
      <label
        for="mc-property-price"
        class="text-sm font-medium"
      >{{ $t('mortgage.common.propertyPrice') }}</label>
      <NumberField
        id="mc-property-price"
        v-model="common.propertyPrice"
        :min="0"
        :step="5000"
        :locale="locale"
        :formatOptions="amountFormat"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="mc-appraisal-value"
        class="text-sm font-medium"
      >{{ $t('mortgage.common.appraisalValue') }}</label>
      <NumberField
        id="mc-appraisal-value"
        v-model="common.appraisalValue"
        :min="0"
        :step="5000"
        :locale="locale"
        :formatOptions="amountFormat"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="mc-available-cash"
        class="text-sm font-medium"
      >{{ $t('mortgage.common.availableCash') }}</label>
      <NumberField
        id="mc-available-cash"
        v-model="common.availableCash"
        :min="0"
        :step="1000"
        :locale="locale"
        :formatOptions="amountFormat"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="mc-principal"
        class="text-sm font-medium"
      >{{ $t('mortgage.common.principal') }}</label>
      <NumberField
        id="mc-principal"
        v-model="common.principal"
        :min="0"
        :step="5000"
        :locale="locale"
        :formatOptions="amountFormat"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
      <p class="text-xs text-muted-foreground">
        {{ $t('mortgage.common.ltv', { value: formatPercent(ltv) }) }}
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="mc-term-years"
        class="text-sm font-medium"
      >{{ $t('mortgage.common.termYears') }}</label>
      <NumberField
        id="mc-term-years"
        v-model="termYears"
        :min="1"
        :max="50"
        :step="1"
        :locale="locale"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="mc-current-index"
        class="flex items-center gap-1 text-sm font-medium"
      >
        {{ $t('mortgage.common.euriborToday') }}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info class="size-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent class="max-w-xs">
              {{ $t('mortgage.common.euriborTooltip') }}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </label>
      <NumberField
        id="mc-current-index"
        v-model="common.currentIndexPct"
        :min="-2"
        :max="20"
        :step="0.1"
        :locale="locale"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>

    <div class="flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 sm:col-span-2 lg:col-span-3">
      <div class="flex items-center gap-2">
        <Switch
          id="mc-opportunity-cost"
          v-model="common.opportunityCostEnabled"
        />
        <label
          for="mc-opportunity-cost"
          class="text-sm font-medium"
        >
          {{ $t('mortgage.common.opportunityCostToggle') }}
        </label>
      </div>

      <div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label
            for="mc-expected-return"
            class="text-sm font-medium"
          >{{ $t('mortgage.common.expectedReturn') }}</label>
          <NumberField
            id="mc-expected-return"
            v-model="common.expectedReturnPct"
            :min="0"
            :max="30"
            :step="0.5"
            :disabled="!common.opportunityCostEnabled"
            :locale="locale"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="mc-capital-gains-tax"
            class="text-sm font-medium"
          >{{ $t('mortgage.common.capitalGainsTax') }}</label>
          <NumberField
            id="mc-capital-gains-tax"
            v-model="common.capitalGainsTaxPct"
            :min="0"
            :max="60"
            :step="1"
            :disabled="!common.opportunityCostEnabled"
            :locale="locale"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>

        <p class="text-xs text-muted-foreground sm:col-span-2">
          {{ $t('mortgage.common.expectedReturnHint') }}
        </p>
      </div>
    </div>
  </div>
</template>
