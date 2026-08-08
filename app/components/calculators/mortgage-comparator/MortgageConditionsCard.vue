<script setup lang="ts">
import type { Mortgage, MortgageRateType } from '~/db/types/FrontDBv3'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import { MORTGAGE_COLORS } from '~/lib/mortgage/templates'

const props = defineProps<{ mortgageId: string }>()

const { common, applyRateTypeDefaults, findMortgage } = useMortgageComparator()
const { t, locale } = useI18n()

/** The editors write straight into the store object, so only its id travels as a prop. */
const mortgage = computed(() => findMortgage(props.mortgageId))

function edit(mutate: (mortgage: Mortgage) => void) {
  const current = mortgage.value
  if (current) mutate(current)
}

const amountFormat = { maximumFractionDigits: 0 } as const

const RATE_TYPE_OPTIONS = computed<{ value: MortgageRateType, label: string }[]>(() => [
  { value: 'fixed', label: t('mortgage.conditions.rateTypes.fixed') },
  { value: 'variable', label: t('mortgage.conditions.rateTypes.variable') },
  { value: 'mixed', label: t('mortgage.conditions.rateTypes.mixed') },
])

const rateType = computed({
  get: () => mortgage.value?.rateType ?? 'fixed',
  set: (value: MortgageRateType) => edit((current) => {
    current.rateType = value
    applyRateTypeDefaults(current)
  }),
})

const reviewEveryMonths = computed({
  get: () => String(mortgage.value?.reviewEveryMonths ?? 12),
  set: (value: string) => edit((current) => {
    current.reviewEveryMonths = Number(value)
  }),
})

const overridesPrincipal = computed({
  get: () => mortgage.value?.principal !== null,
  set: (value: boolean) => edit((current) => {
    current.principal = value ? (common.value?.principal ?? 0) : null
  }),
})

const overridesTerm = computed({
  get: () => mortgage.value?.termMonths !== null,
  set: (value: boolean) => edit((current) => {
    current.termMonths = value ? (common.value?.termMonths ?? 360) : null
  }),
})

const ownPrincipal = computed({
  get: () => mortgage.value?.principal ?? common.value?.principal ?? 0,
  set: (value: number) => edit((current) => {
    current.principal = value
  }),
})

const ownTermYears = computed({
  get: () => Math.round((mortgage.value?.termMonths ?? common.value?.termMonths ?? 360) / 12),
  set: (value: number) => edit((current) => {
    current.termMonths = Math.max(1, Math.round(value)) * 12
  }),
})

const mixedFixedYears = computed({
  get: () => Math.round((mortgage.value?.mixedFixedMonths ?? 0) / 12),
  set: (value: number) => edit((current) => {
    current.mixedFixedMonths = Math.max(0, Math.round(value)) * 12
  }),
})

const hasFloor = computed({
  get: () => mortgage.value?.floorPct !== null,
  set: (value: boolean) => edit((current) => {
    current.floorPct = value ? 0 : null
  }),
})

const hasCap = computed({
  get: () => mortgage.value?.capPct !== null,
  set: (value: boolean) => edit((current) => {
    current.capPct = value ? 5 : null
  }),
})

const hasMaxBonus = computed({
  get: () => mortgage.value?.maxBonusPp !== null,
  set: (value: boolean) => edit((current) => {
    current.maxBonusPp = value ? 1 : null
  }),
})
</script>

<template>
  <div
    v-if="mortgage"
    class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3"
  >
    <div class="flex flex-col gap-2">
      <label
        :for="`mc-name-${mortgage.id}`"
        class="text-sm font-medium"
      >{{ $t('common.name') }}</label>
      <Input
        :id="`mc-name-${mortgage.id}`"
        v-model="mortgage.name"
        :placeholder="$t('mortgage.conditions.namePlaceholder')"
      />
    </div>

    <div class="flex flex-col gap-2">
      <label
        :for="`mc-bank-${mortgage.id}`"
        class="text-sm font-medium"
      >{{ $t('mortgage.conditions.bank') }}</label>
      <Input
        :id="`mc-bank-${mortgage.id}`"
        v-model="mortgage.bankName"
        :placeholder="$t('mortgage.conditions.bankPlaceholder')"
      />
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium">{{ $t('mortgage.conditions.colorAndState') }}</span>
      <div class="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2">
        <div class="flex gap-1.5">
          <button
            v-for="color in MORTGAGE_COLORS"
            :key="color"
            type="button"
            class="size-5 rounded-full border-2 transition-transform hover:scale-110"
            :style="{ backgroundColor: color, borderColor: mortgage.color === color ? 'currentColor' : 'transparent' }"
            :aria-label="$t('mortgage.conditions.colorAria', { color })"
            @click="mortgage.color = color"
          />
        </div>
        <div class="flex items-center gap-2">
          <Switch
            :id="`mc-enabled-${mortgage.id}`"
            v-model="mortgage.enabled"
          />
          <label
            :for="`mc-enabled-${mortgage.id}`"
            class="text-sm"
          >{{ $t('mortgage.conditions.inComparison') }}</label>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <label class="text-sm font-medium">{{ $t('mortgage.conditions.rateType') }}</label>
      <Select v-model="rateType">
        <SelectTrigger class="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="option in RATE_TYPE_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div
      v-if="mortgage.rateType !== 'variable'"
      class="flex flex-col gap-2"
    >
      <label
        :for="`mc-fixed-rate-${mortgage.id}`"
        class="text-sm font-medium"
      >
        {{ mortgage.rateType === 'mixed' ? $t('mortgage.conditions.tinFixedTranche') : $t('mortgage.conditions.tin') }}
      </label>
      <NumberField
        :id="`mc-fixed-rate-${mortgage.id}`"
        v-model="mortgage.fixedRatePct"
        :min="0"
        :max="20"
        :step="0.05"
        :locale="locale"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>

    <div
      v-if="mortgage.rateType === 'mixed'"
      class="flex flex-col gap-2"
    >
      <label
        :for="`mc-mixed-years-${mortgage.id}`"
        class="text-sm font-medium"
      >{{ $t('mortgage.conditions.fixedYears') }}</label>
      <NumberField
        :id="`mc-mixed-years-${mortgage.id}`"
        v-model="mixedFixedYears"
        :min="0"
        :max="40"
        :step="1"
        :locale="locale"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>

    <template v-if="mortgage.rateType === 'variable'">
      <div class="flex flex-col gap-2">
        <label
          :for="`mc-initial-rate-${mortgage.id}`"
          class="text-sm font-medium"
        >{{ $t('mortgage.conditions.initialRate') }}</label>
        <NumberField
          :id="`mc-initial-rate-${mortgage.id}`"
          v-model="mortgage.initialRatePct"
          :min="0"
          :max="20"
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
          :for="`mc-initial-months-${mortgage.id}`"
          class="text-sm font-medium"
        >{{ $t('mortgage.conditions.initialMonths') }}</label>
        <NumberField
          :id="`mc-initial-months-${mortgage.id}`"
          v-model="mortgage.initialRateMonths"
          :min="0"
          :max="120"
          :step="1"
          :locale="locale"
        >
          <NumberFieldContent>
            <NumberFieldInput />
          </NumberFieldContent>
        </NumberField>
      </div>
    </template>

    <template v-if="mortgage.rateType !== 'fixed'">
      <div class="flex flex-col gap-2">
        <label
          :for="`mc-spread-${mortgage.id}`"
          class="text-sm font-medium"
        >{{ $t('mortgage.conditions.spread') }}</label>
        <NumberField
          :id="`mc-spread-${mortgage.id}`"
          v-model="mortgage.spreadPct"
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
        <label class="text-sm font-medium">{{ $t('mortgage.conditions.review') }}</label>
        <Select v-model="reviewEveryMonths">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">
              {{ $t('mortgage.conditions.review6') }}
            </SelectItem>
            <SelectItem value="12">
              {{ $t('mortgage.conditions.review12') }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </template>

    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <Checkbox
          :id="`mc-own-principal-${mortgage.id}`"
          v-model="overridesPrincipal"
        />
        <label
          :for="`mc-own-principal-${mortgage.id}`"
          class="text-sm font-medium"
        >{{ $t('mortgage.conditions.ownPrincipal') }}</label>
      </div>
      <NumberField
        v-model="ownPrincipal"
        :min="0"
        :step="5000"
        :disabled="!overridesPrincipal"
        :locale="locale"
        :formatOptions="amountFormat"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
      <p
        v-if="!overridesPrincipal"
        class="text-xs text-muted-foreground"
      >
        {{ $t('mortgage.conditions.inherited') }}
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <Checkbox
          :id="`mc-own-term-${mortgage.id}`"
          v-model="overridesTerm"
        />
        <label
          :for="`mc-own-term-${mortgage.id}`"
          class="text-sm font-medium"
        >{{ $t('mortgage.conditions.ownTerm') }}</label>
      </div>
      <NumberField
        v-model="ownTermYears"
        :min="1"
        :max="50"
        :step="1"
        :disabled="!overridesTerm"
        :locale="locale"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
      <p
        v-if="!overridesTerm"
        class="text-xs text-muted-foreground"
      >
        {{ $t('mortgage.conditions.inherited') }}
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <Checkbox
          :id="`mc-floor-${mortgage.id}`"
          v-model="hasFloor"
        />
        <label
          :for="`mc-floor-${mortgage.id}`"
          class="text-sm font-medium"
        >{{ $t('mortgage.conditions.floor') }}</label>
      </div>
      <NumberField
        v-model="mortgage.floorPct"
        :min="-2"
        :max="20"
        :step="0.05"
        :disabled="!hasFloor"
        :locale="locale"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <Checkbox
          :id="`mc-cap-${mortgage.id}`"
          v-model="hasCap"
        />
        <label
          :for="`mc-cap-${mortgage.id}`"
          class="text-sm font-medium"
        >{{ $t('mortgage.conditions.cap') }}</label>
      </div>
      <NumberField
        v-model="mortgage.capPct"
        :min="0"
        :max="30"
        :step="0.05"
        :disabled="!hasCap"
        :locale="locale"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-2">
        <Checkbox
          :id="`mc-max-bonus-${mortgage.id}`"
          v-model="hasMaxBonus"
        />
        <label
          :for="`mc-max-bonus-${mortgage.id}`"
          class="text-sm font-medium"
        >{{ $t('mortgage.conditions.maxBonus') }}</label>
      </div>
      <NumberField
        v-model="mortgage.maxBonusPp"
        :min="0"
        :max="5"
        :step="0.05"
        :disabled="!hasMaxBonus"
        :locale="locale"
      >
        <NumberFieldContent>
          <NumberFieldInput />
        </NumberFieldContent>
      </NumberField>
    </div>
  </div>
</template>
