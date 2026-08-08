<script setup lang="ts">
import { Settings2 } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import CommonInputsFields from '~/components/calculators/mortgage-comparator/CommonInputsFields.vue'
import ScenarioFields from '~/components/calculators/mortgage-comparator/ScenarioFields.vue'
import { formatCompactCurrency, formatPercent } from '~/composables/useMortgageComparator'

const { common, selectedScenario } = useMortgageComparator()
const { t } = useI18n()

/** Short recap so the button says what lives behind it without opening it. */
const summary = computed(() => {
  if (!common.value) return []
  return [
    t('mortgage.globalSettings.summaryPrincipal', { value: formatCompactCurrency(common.value.principal) }),
    t('common.yearsCount', { count: Math.round(common.value.termMonths / 12) }),
    t('mortgage.globalSettings.summaryEuribor', { value: formatPercent(common.value.currentIndexPct) }),
    selectedScenario.value?.name ?? t('mortgage.globalSettings.summaryScenario'),
  ]
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 class="mr-1 size-4" />
          {{ $t('mortgage.globalSettings.button') }}
        </Button>
      </DialogTrigger>
      <DialogContent class="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{{ $t('mortgage.globalSettings.title') }}</DialogTitle>
          <DialogDescription>
            {{ $t('mortgage.globalSettings.description') }}
          </DialogDescription>
        </DialogHeader>

        <CommonInputsFields />

        <Separator />

        <div class="flex flex-col gap-3">
          <h3 class="text-sm font-semibold">
            {{ $t('mortgage.globalSettings.scenarioHeading') }}
          </h3>
          <ScenarioFields />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button>{{ $t('common.done') }}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <p class="text-xs text-muted-foreground">
      {{ $t('mortgage.globalSettings.hint', { summary: summary.join(' · ') }) }}
    </p>
  </div>
</template>
