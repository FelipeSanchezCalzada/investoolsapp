<script setup lang="ts">
import { Wand2 } from '@lucide/vue'
import type { MortgageBinding, MortgageBindingCostMode, MortgageBindingType } from '~/db/types/FrontDBv3'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import InvestmentBindingDialog from '~/components/calculators/mortgage-comparator/InvestmentBindingDialog.vue'
import { BINDING_CATALOG, BINDING_COST_MODES, bindingCostModeKey, bindingHintKey, createCostForMode } from '~/lib/mortgage/bindingCatalog'

const props = defineProps<{ bindingId: string | null, mortgageId: string }>()
const emit = defineEmits<{ close: [] }>()

const { findMortgage } = useMortgageComparator()
const { t, locale } = useI18n()

/** The form writes straight into the store object, so only ids travel as props. */
const binding = computed<MortgageBinding | null>(() =>
  findMortgage(props.mortgageId)?.bindings.find(item => item.id === props.bindingId) ?? null,
)

function edit(mutate: (binding: MortgageBinding) => void) {
  const current = binding.value
  if (current) mutate(current)
}

const amountFormat = { maximumFractionDigits: 0 } as const

const investmentDialogOpen = ref(false)

const isOpen = computed(() => binding.value !== null)

const costMode = computed({
  get: () => binding.value?.cost.mode ?? 'free',
  set: (value: MortgageBindingCostMode) => edit((current) => {
    current.cost = createCostForMode(value)
  }),
})

const bindingType = computed({
  get: () => binding.value?.type ?? 'otro',
  set: (value: MortgageBindingType) => edit((current) => {
    current.type = value
  }),
})

const hasToYear = computed({
  get: () => binding.value?.toYear !== null,
  set: (value: boolean) => edit((current) => {
    current.toYear = value ? current.fromYear + 5 : null
  }),
})

const requirement = computed({
  get: () => binding.value?.requirement ?? '',
  set: (value: string) => edit((current) => {
    current.requirement = value
  }),
})

const catalogHint = computed(() => t(bindingHintKey(bindingType.value)))
</script>

<template>
  <Dialog
    :open="isOpen"
    @update:open="(value) => { if (!value) emit('close') }"
  >
    <DialogContent
      v-if="binding"
      class="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
    >
      <DialogHeader>
        <DialogTitle>{{ $t('mortgage.bindingForm.title') }}</DialogTitle>
        <DialogDescription>
          {{ $t('mortgage.bindingForm.description') }}
        </DialogDescription>
      </DialogHeader>

      <div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <div class="flex flex-col gap-2">
          <label
            for="mc-binding-name"
            class="text-sm font-medium"
          >{{ $t('common.name') }}</label>
          <Input
            id="mc-binding-name"
            v-model="binding.name"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">{{ $t('mortgage.bindingForm.product') }}</label>
          <Select v-model="bindingType">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="entry in BINDING_CATALOG"
                :key="entry.type"
                :value="entry.type"
              >
                {{ $t(`mortgage.bindings.catalog.${entry.type}.label`) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p
          v-if="catalogHint"
          class="text-xs text-muted-foreground sm:col-span-2"
        >
          {{ catalogHint }}
        </p>

        <div class="flex flex-col gap-2">
          <label
            for="mc-binding-bonus"
            class="text-sm font-medium"
          >{{ $t('mortgage.bindingForm.bonus') }}</label>
          <NumberField
            id="mc-binding-bonus"
            v-model="binding.rateReductionPp"
            :min="0"
            :max="3"
            :step="0.05"
            :locale="locale"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">{{ $t('mortgage.bindingForm.costModel') }}</label>
          <Select v-model="costMode">
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="mode in BINDING_COST_MODES"
                :key="mode"
                :value="mode"
              >
                {{ $t(bindingCostModeKey(mode)) }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 sm:col-span-2">
          <div class="flex items-center gap-2">
            <Switch
              id="mc-binding-required"
              v-model="binding.required"
            />
            <label
              for="mc-binding-required"
              class="text-sm"
            >{{ $t('mortgage.bindingForm.required') }}</label>
          </div>
          <div class="flex items-center gap-2">
            <Switch
              id="mc-binding-active"
              v-model="binding.active"
            />
            <label
              for="mc-binding-active"
              class="text-sm"
            >{{ $t('mortgage.bindingForm.active') }}</label>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label
            for="mc-binding-from"
            class="text-sm font-medium"
          >{{ $t('mortgage.bindingForm.fromYear') }}</label>
          <NumberField
            id="mc-binding-from"
            v-model="binding.fromYear"
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
          <div class="flex items-center gap-2">
            <Checkbox
              id="mc-binding-has-to"
              v-model="hasToYear"
            />
            <label
              for="mc-binding-has-to"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.toYear') }}</label>
          </div>
          <NumberField
            v-model="binding.toYear"
            :min="1"
            :max="50"
            :step="1"
            :disabled="binding.toYear === null"
            :locale="locale"
          >
            <NumberFieldContent>
              <NumberFieldInput :placeholder="$t('mortgage.bindingForm.lifetimePlaceholder')" />
            </NumberFieldContent>
          </NumberField>
        </div>

        <!-- Cost model specific fields -->
        <template v-if="binding.cost.mode === 'annual'">
          <div class="flex flex-col gap-2">
            <label
              for="mc-binding-bank-cost"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.annualBankCost') }}</label>
            <NumberField
              id="mc-binding-bank-cost"
              v-model="binding.cost.bankCost"
              :min="0"
              :step="10"
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
              for="mc-binding-market-cost"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.annualMarketCost') }}</label>
            <NumberField
              id="mc-binding-market-cost"
              v-model="binding.cost.marketCost"
              :min="0"
              :step="10"
              :locale="locale"
              :formatOptions="amountFormat"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>
            <p class="text-xs text-muted-foreground">
              {{ $t('mortgage.bindingForm.annualMarketHint') }}
            </p>
          </div>
          <div class="flex flex-col gap-2">
            <label
              for="mc-binding-growth"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.annualGrowth') }}</label>
            <NumberField
              id="mc-binding-growth"
              v-model="binding.cost.growthPct"
              :min="0"
              :max="20"
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
              for="mc-binding-discount"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.annualDiscount') }}</label>
            <NumberField
              id="mc-binding-discount"
              v-model="binding.cost.bankFirstYearDiscountPct"
              :min="0"
              :max="100"
              :step="5"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>
          </div>
        </template>

        <template v-else-if="binding.cost.mode === 'permille'">
          <div class="flex flex-col gap-2">
            <label
              for="mc-binding-permille"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.permilleBank') }}</label>
            <NumberField
              id="mc-binding-permille"
              v-model="binding.cost.permille"
              :min="0"
              :max="50"
              :step="0.1"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>
          </div>
          <div class="flex flex-col gap-2">
            <label
              for="mc-binding-market-permille"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.permilleMarket') }}</label>
            <NumberField
              id="mc-binding-market-permille"
              v-model="binding.cost.marketPermille"
              :min="0"
              :max="50"
              :step="0.1"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>
          </div>
        </template>

        <template v-else-if="binding.cost.mode === 'singlePremium'">
          <div class="flex flex-col gap-2">
            <label
              for="mc-binding-premium"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.singlePremiumBank') }}</label>
            <NumberField
              id="mc-binding-premium"
              v-model="binding.cost.amount"
              :min="0"
              :step="100"
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
              for="mc-binding-premium-market"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.singlePremiumMarket') }}</label>
            <NumberField
              id="mc-binding-premium-market"
              v-model="binding.cost.marketAmount"
              :min="0"
              :step="100"
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
              for="mc-binding-cover-years"
              class="text-sm font-medium"
            >{{ $t('mortgage.bindingForm.coverYears') }}</label>
            <NumberField
              id="mc-binding-cover-years"
              v-model="binding.cost.coverYears"
              :min="1"
              :max="50"
              :step="1"
              :locale="locale"
            >
              <NumberFieldContent>
                <NumberFieldInput />
              </NumberFieldContent>
            </NumberField>
            <p class="text-xs text-muted-foreground">
              {{ $t('mortgage.bindingForm.coverYearsHint') }}
            </p>
          </div>
          <div class="flex items-center gap-2 self-end pb-2">
            <Switch
              id="mc-binding-financed"
              v-model="binding.cost.financed"
            />
            <label
              for="mc-binding-financed"
              class="text-sm"
            >{{ $t('mortgage.bindingForm.financed') }}</label>
          </div>
        </template>

        <template v-else-if="binding.cost.mode === 'investment'">
          <div class="rounded-lg border bg-muted/40 p-3 sm:col-span-2">
            <p class="mb-2 text-sm text-muted-foreground">
              {{ $t('mortgage.bindingForm.investmentNote') }}
            </p>
            <Button
              size="sm"
              variant="outline"
              @click="investmentDialogOpen = true"
            >
              <Wand2 class="mr-1 size-4" />
              {{ $t('mortgage.bindingForm.openAssistant') }}
            </Button>
          </div>
        </template>

        <div class="flex flex-col gap-2 sm:col-span-2">
          <label
            for="mc-binding-requirement"
            class="text-sm font-medium"
          >{{ $t('mortgage.bindingForm.requirement') }}</label>
          <Input
            id="mc-binding-requirement"
            v-model="requirement"
            :placeholder="$t('mortgage.bindingForm.requirementPlaceholder')"
          />
          <p class="text-xs text-muted-foreground">
            {{ $t('mortgage.bindingForm.requirementHint') }}
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button @click="emit('close')">
          {{ $t('common.done') }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <InvestmentBindingDialog
    v-if="binding && binding.cost.mode === 'investment'"
    :bindingId="investmentDialogOpen ? binding.id : null"
    :mortgageId="mortgageId"
    @close="investmentDialogOpen = false"
  />
</template>
