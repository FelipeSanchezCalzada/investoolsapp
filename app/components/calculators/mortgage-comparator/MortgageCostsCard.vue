<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import type { MortgageFeeTier } from '~/db/types/FrontDBv3'
import { Button } from '@/components/ui/button'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldInput,
} from '@/components/ui/number-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UPFRONT_COST_KEYS, upfrontCostLabelKey } from '~/lib/mortgage/calculate'

const props = defineProps<{ mortgageId: string }>()

const { findMortgage } = useMortgageComparator()
const { t, locale } = useI18n()

/** The editors write straight into the store object, so only its id travels as a prop. */
const mortgage = computed(() => findMortgage(props.mortgageId))

const amountFormat = { maximumFractionDigits: 0 } as const

const feeGroups = computed(() => [
  { key: 'partial' as const, label: t('mortgage.costs.partial'), tiers: mortgage.value?.earlyRepaymentFees.partial ?? [] },
  { key: 'total' as const, label: t('mortgage.costs.totalCancellation'), tiers: mortgage.value?.earlyRepaymentFees.total ?? [] },
])

function addTier(tiers: MortgageFeeTier[]) {
  const last = tiers[tiers.length - 1]
  tiers.push({ fromYear: (last?.toYear ?? last?.fromYear ?? 0) + 1, toYear: null, pct: 0 })
}

function removeTier(tiers: MortgageFeeTier[], index: number) {
  tiers.splice(index, 1)
}

function hasToYear(tier: MortgageFeeTier): boolean {
  return tier.toYear !== null
}

function setHasToYear(tier: MortgageFeeTier, value: boolean) {
  tier.toYear = value ? tier.fromYear + 1 : null
}
</script>

<template>
  <div
    v-if="mortgage"
    class="flex flex-col gap-6"
  >
    <div>
      <p class="mb-3 text-xs text-muted-foreground">
        {{ $t('mortgage.costs.lcciNote') }}
      </p>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="key in UPFRONT_COST_KEYS"
          :key="key"
          class="flex flex-col gap-2 rounded-lg border p-3"
        >
          <label
            :for="`mc-cost-${mortgage.id}-${key}`"
            class="text-sm leading-5 font-medium sm:min-h-10"
          >
            {{ $t('mortgage.costs.upfrontLabel', { label: $t(upfrontCostLabelKey(key)) }) }}
          </label>
          <NumberField
            :id="`mc-cost-${mortgage.id}-${key}`"
            v-model="mortgage.upfrontCosts.amounts[key]"
            :min="0"
            :step="50"
            :locale="locale"
            :formatOptions="amountFormat"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
          <Select v-model="mortgage.upfrontCosts.paidBy[key]">
            <SelectTrigger
              size="sm"
              class="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client">
                {{ $t('mortgage.costs.paidByClient') }}
              </SelectItem>
              <SelectItem value="bank">
                {{ $t('mortgage.costs.paidByBank') }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex flex-col gap-2 rounded-lg border border-primary/40 p-3">
          <label
            :for="`mc-opening-fee-${mortgage.id}`"
            class="text-sm leading-5 font-medium sm:min-h-10"
          >{{ $t('mortgage.costs.openingFee') }}</label>
          <NumberField
            :id="`mc-opening-fee-${mortgage.id}`"
            v-model="mortgage.upfrontCosts.openingFeePct"
            :min="0"
            :max="5"
            :step="0.05"
            :locale="locale"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
          <p class="text-xs text-muted-foreground">
            {{ $t('mortgage.costs.openingFeeHint') }}
          </p>
        </div>
      </div>
    </div>

    <div>
      <h4 class="mb-1 text-sm font-semibold">
        {{ $t('mortgage.costs.earlyRepaymentTitle') }}
      </h4>
      <p class="mb-3 text-xs text-muted-foreground">
        {{ $t('mortgage.costs.earlyRepaymentNote') }}
      </p>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          v-for="group in feeGroups"
          :key="group.key"
          class="rounded-lg border p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-medium">{{ group.label }}</span>
            <Button
              size="sm"
              variant="ghost"
              @click="addTier(group.tiers)"
            >
              <Plus class="mr-1 size-4" />
              {{ $t('mortgage.costs.tier') }}
            </Button>
          </div>

          <div
            v-if="group.tiers.length"
            class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-x-2 gap-y-1 text-xs text-muted-foreground"
          >
            <span>{{ $t('mortgage.costs.fromYear') }}</span>
            <span>{{ $t('mortgage.costs.toYear') }}</span>
            <span>{{ $t('mortgage.costs.feePct') }}</span>
            <span class="w-9" />
          </div>

          <div
            v-for="(tier, index) in group.tiers"
            :key="index"
            class="mt-1 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-start gap-2"
          >
            <NumberField
              v-model="tier.fromYear"
              :min="0"
              :max="50"
              :step="1"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>

            <div class="flex flex-col gap-1">
              <NumberField
                :modelValue="tier.toYear ?? undefined"
                :min="1"
                :max="50"
                :step="1"
                :disabled="!hasToYear(tier)"
                :locale="locale"
                @update:modelValue="(value) => tier.toYear = Number.isFinite(value) ? Number(value) : null"
              >
                <NumberFieldContent>
                  <NumberFieldInput :placeholder="$t('mortgage.costs.endPlaceholder')" />
                </NumberFieldContent>
              </NumberField>
              <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  :checked="hasToYear(tier)"
                  class="size-3.5 accent-primary"
                  @change="setHasToYear(tier, ($event.target as HTMLInputElement).checked)"
                >
                {{ $t('mortgage.costs.bounded') }}
              </label>
            </div>

            <NumberField
              v-model="tier.pct"
              :min="0"
              :max="10"
              :step="0.05"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>

            <Button
              size="icon"
              variant="ghost"
              class="text-destructive hover:text-destructive"
              @click="removeTier(group.tiers, index)"
            >
              <Trash2 class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
