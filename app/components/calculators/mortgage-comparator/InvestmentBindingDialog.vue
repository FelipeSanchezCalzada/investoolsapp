<script setup lang="ts">
import { Building2, CircleCheck, CircleX, User } from '@lucide/vue'
import type { MortgageBinding } from '~/db/types/FrontDBv3'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldInput,
} from '@/components/ui/number-field'
import { simulateInvestmentBinding } from '~/lib/mortgage/investment'
import { formatCurrency, formatPercent, formatPp } from '~/composables/useMortgageComparator'

const { locale } = useI18n()

const props = defineProps<{ bindingId: string | null, mortgageId: string }>()
const emit = defineEmits<{ close: [] }>()

const { common, findMortgage, resultFor } = useMortgageComparator()

const amountFormat = { maximumFractionDigits: 0 } as const

/** The assistant writes straight into the store object, so only ids travel as props. */
const binding = computed<MortgageBinding | null>(() =>
  findMortgage(props.mortgageId)?.bindings.find(item => item.id === props.bindingId) ?? null,
)

const cost = computed(() => {
  const current = binding.value
  return current && current.cost.mode === 'investment' ? current.cost : null
})

const inheritedReturnPct = computed(() => common.value?.expectedReturnPct ?? 0)

const termYears = computed(() => {
  const result = resultFor(props.mortgageId)
  if (result) return result.years
  return Math.ceil((common.value?.termMonths ?? 360) / 12)
})

const yearsInForce = computed(() => {
  const current = binding.value
  if (!current) return 0
  const endYear = Math.min(current.toYear ?? termYears.value, termYears.value)
  return Math.max(0, endYear - current.fromYear)
})

const simulation = computed(() => {
  const current = cost.value
  if (!current) return null
  return simulateInvestmentBinding({
    cost: current,
    years: yearsInForce.value,
    fallbackReturnPct: inheritedReturnPct.value,
  })
})

const interestSavings = computed(() => {
  const result = resultFor(props.mortgageId)
  const worthiness = result?.bindingsWorthiness.find(item => item.bindingId === props.bindingId)
  return worthiness?.interestSavings ?? null
})

const worthIt = computed(() => {
  if (interestSavings.value === null || !simulation.value) return null
  return interestSavings.value > simulation.value.totalCost
})

const overridesReturn = computed({
  get: () => cost.value?.expectedReturnPct !== null,
  set: (value: boolean) => {
    if (cost.value) cost.value.expectedReturnPct = value ? inheritedReturnPct.value : null
  },
})
</script>

<template>
  <Dialog
    :open="binding !== null && cost !== null"
    @update:open="(value) => { if (!value) emit('close') }"
  >
    <DialogContent
      v-if="binding && cost"
      class="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"
    >
      <DialogHeader>
        <DialogTitle>{{ $t('mortgage.investment.title', { name: binding.name }) }}</DialogTitle>
        <DialogDescription>
          {{ $t('mortgage.investment.description') }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-3 rounded-lg border p-3">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Building2 class="size-4" />
            {{ $t('mortgage.investment.bankHeading') }}
          </div>
          <div class="flex flex-col gap-2">
            <label
              for="mc-inv-bank-fee"
              class="text-sm"
            >{{ $t('mortgage.investment.bankFee') }}</label>
            <NumberField
              id="mc-inv-bank-fee"
              v-model="cost.bankFeePct"
              :min="0"
              :max="10"
              :step="0.05"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>
          </div>
          <div class="flex flex-col gap-2">
            <label
              for="mc-inv-gap"
              class="text-sm"
            >{{ $t('mortgage.investment.bankGap') }}</label>
            <NumberField
              id="mc-inv-gap"
              v-model="cost.bankReturnGapPct"
              :min="0"
              :max="10"
              :step="0.1"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>
          </div>
          <p class="mt-auto text-sm">
            {{ $t('mortgage.investment.finalBalance') }} <strong>{{ formatCurrency(simulation?.finalBankBalance ?? 0) }}</strong>
          </p>
        </div>

        <div class="flex flex-col gap-3 rounded-lg border p-3">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <User class="size-4" />
            {{ $t('mortgage.investment.alternativeHeading') }}
          </div>
          <div class="flex flex-col gap-2">
            <label
              for="mc-inv-alt-fee"
              class="text-sm"
            >{{ $t('mortgage.investment.alternativeFee') }}</label>
            <NumberField
              id="mc-inv-alt-fee"
              v-model="cost.alternativeFeePct"
              :min="0"
              :max="10"
              :step="0.05"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>
          </div>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <Switch
                id="mc-inv-own-return"
                v-model="overridesReturn"
              />
              <label
                for="mc-inv-own-return"
                class="text-sm"
              >{{ $t('mortgage.investment.ownReturn') }}</label>
            </div>
            <NumberField
              v-model="cost.expectedReturnPct"
              :min="0"
              :max="30"
              :step="0.5"
              :disabled="!overridesReturn"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput :placeholder="`${inheritedReturnPct}`" />
              </NumberFieldContent>
            </NumberField>
            <p
              v-if="!overridesReturn"
              class="text-xs text-muted-foreground"
            >
              {{ $t('mortgage.investment.inheritedHint', { value: formatPercent(inheritedReturnPct) }) }}
            </p>
          </div>
          <p class="mt-auto text-sm">
            {{ $t('mortgage.investment.finalBalance') }} <strong>{{ formatCurrency(simulation?.finalAlternativeBalance ?? 0) }}</strong>
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="mc-inv-initial"
            class="text-sm font-medium"
          >{{ $t('mortgage.investment.initialContribution') }}</label>
          <NumberField
            id="mc-inv-initial"
            v-model="cost.initialContribution"
            :min="0"
            :step="500"
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
            for="mc-inv-annual"
            class="text-sm font-medium"
          >{{ $t('mortgage.investment.annualContribution') }}</label>
          <NumberField
            id="mc-inv-annual"
            v-model="cost.annualContribution"
            :min="0"
            :step="500"
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
            for="mc-inv-min-years"
            class="text-sm font-medium"
          >{{ $t('mortgage.investment.minYears') }}</label>
          <NumberField
            id="mc-inv-min-years"
            v-model="cost.minYears"
            :min="0"
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
            for="mc-inv-penalty"
            class="text-sm font-medium"
          >{{ $t('mortgage.investment.exitPenalty') }}</label>
          <NumberField
            id="mc-inv-penalty"
            v-model="cost.exitPenaltyPct"
            :min="0"
            :max="50"
            :step="0.5"
            :locale="locale"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="mc-inv-tax"
            class="text-sm font-medium"
          >{{ $t('mortgage.investment.taxDeduction') }}</label>
          <NumberField
            id="mc-inv-tax"
            v-model="cost.taxDeductionPct"
            :min="0"
            :max="60"
            :step="1"
            :locale="locale"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
          <p class="text-xs text-muted-foreground">
            {{ $t('mortgage.investment.taxDeductionHint') }}
          </p>
        </div>

        <div class="flex items-center gap-2 self-end pb-2">
          <Switch
            id="mc-inv-would-invest"
            v-model="cost.wouldInvestAnyway"
          />
          <label
            for="mc-inv-would-invest"
            class="text-sm"
          >{{ $t('mortgage.investment.wouldInvestAnyway') }}</label>
        </div>

        <p
          v-if="!cost.wouldInvestAnyway"
          class="text-xs text-muted-foreground sm:col-span-2"
        >
          {{ $t('mortgage.investment.notInvestingHint') }}
        </p>
      </div>

      <div
        class="rounded-lg border p-3 text-sm"
        :class="worthIt === null
          ? 'bg-muted/40'
          : worthIt
            ? 'border-green-500/30 bg-green-500/5'
            : 'border-red-500/30 bg-red-500/5'"
      >
        <div class="flex items-center gap-2 font-medium">
          <component
            :is="worthIt ? CircleCheck : CircleX"
            v-if="worthIt !== null"
            class="size-4"
            :class="worthIt ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
          />
          <span v-if="worthIt === null">{{ $t('mortgage.investment.verdictPending') }}</span>
          <span v-else>
            {{ $t('mortgage.investment.verdict', {
              cost: formatCurrency(simulation?.totalCost ?? 0),
              years: yearsInForce,
              bonus: formatPp(binding.rateReductionPp),
              savings: formatCurrency(interestSavings ?? 0),
            }) }}
            <strong>{{ worthIt ? $t('mortgage.investment.worthIt') : $t('mortgage.investment.notWorthIt') }}</strong>
          </span>
        </div>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ $t('mortgage.investment.contributed', { value: formatCurrency(simulation?.totalContributed ?? 0) }) }}
        </p>
      </div>

      <DialogFooter>
        <Button @click="emit('close')">
          {{ $t('common.done') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
