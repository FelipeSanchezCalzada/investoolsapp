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

/** Short recap so the button says what lives behind it without opening it. */
const summary = computed(() => {
  if (!common.value) return []
  return [
    `Capital ${formatCompactCurrency(common.value.principal)}`,
    `${Math.round(common.value.termMonths / 12)} años`,
    `Euríbor hoy ${formatPercent(common.value.currentIndexPct)}`,
    selectedScenario.value?.name ?? 'Escenario',
  ]
})
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings2 class="mr-1 size-4" />
          Datos globales
        </Button>
      </DialogTrigger>
      <DialogContent class="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Datos globales de la comparativa</DialogTitle>
          <DialogDescription>
            Capital, plazo, precio de la vivienda, ahorro, coste de oportunidad y escenario de
            Euríbor. Son comunes a todas las ofertas para que la comparación sea justa.
          </DialogDescription>
        </DialogHeader>

        <CommonInputsFields />

        <Separator />

        <div class="flex flex-col gap-3">
          <h3 class="text-sm font-semibold">
            Escenario de Euríbor
          </h3>
          <ScenarioFields />
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button>Hecho</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <p class="text-xs text-muted-foreground">
      Aquí se configuran los datos comunes a todas las hipotecas —{{ summary.join(' · ') }}—.
    </p>
  </div>
</template>
