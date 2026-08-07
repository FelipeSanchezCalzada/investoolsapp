<script setup lang="ts">
import { Plus, RotateCcw, Trash2 } from '@lucide/vue'
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
import { createSeedScenarios, SCENARIO_IDS } from '~/lib/mortgage/templates'

const { comparator, scenarios, selectedScenario, common } = useMortgageComparator()

const selectedScenarioId = computed({
  get: () => comparator.value?.selectedScenarioId ?? SCENARIO_IDS.CURRENT,
  set: (value) => {
    if (comparator.value) comparator.value.selectedScenarioId = value
  },
})

function addPoint() {
  const scenario = selectedScenario.value
  if (!scenario) return
  const lastPoint = scenario.points[scenario.points.length - 1]
  scenario.points.push({
    year: (lastPoint?.year ?? 0) + 5,
    valuePct: lastPoint?.valuePct ?? 0,
  })
}

function removePoint(index: number) {
  const scenario = selectedScenario.value
  if (!scenario || scenario.points.length <= 1) return
  scenario.points.splice(index, 1)
}

function resetScenario() {
  const scenario = selectedScenario.value
  if (!scenario || !common.value || !comparator.value) return
  const seed = createSeedScenarios(common.value.currentIndexPct).find(item => item.id === scenario.id)
  if (seed) scenario.points = seed.points
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex w-full flex-wrap items-center gap-2">
      <Select v-model="selectedScenarioId">
        <SelectTrigger class="w-full min-w-0 sm:w-64">
          <SelectValue placeholder="Escenario" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem
            v-for="scenario in scenarios"
            :key="scenario.id"
            :value="scenario.id"
          >
            {{ scenario.name }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        class="shrink-0"
        @click="resetScenario"
      >
        <RotateCcw class="mr-1 size-4" />
        Restaurar
      </Button>
    </div>

    <p class="text-xs text-muted-foreground">
      El escenario es común a toda la comparativa, para que la comparación sea justa.
      Los puntos se interpolan linealmente y el valor se mantiene constante tras el último.
      El desplazamiento de ±1 pp a 5 años es una convención de sensibilidad, no una previsión.
    </p>

    <div
      v-if="selectedScenario"
      class="flex flex-wrap items-end gap-3"
    >
      <div
        v-for="(point, index) in selectedScenario.points"
        :key="index"
        class="flex items-end gap-2 rounded-lg border p-2"
      >
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted-foreground">Año</span>
          <NumberField
            v-model="point.year"
            :min="0"
            :max="50"
            :step="1"
            locale="es-ES"
            class="w-24"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-muted-foreground">Índice (%)</span>
          <NumberField
            v-model="point.valuePct"
            :min="-2"
            :max="20"
            :step="0.1"
            locale="es-ES"
            class="w-28"
          >
            <NumberFieldContent>
              <NumberFieldInput />
            </NumberFieldContent>
          </NumberField>
        </div>
        <Button
          size="icon"
          variant="ghost"
          class="text-destructive hover:text-destructive"
          :disabled="selectedScenario.points.length <= 1"
          @click="removePoint(index)"
        >
          <Trash2 class="size-4" />
        </Button>
      </div>

      <Button
        size="sm"
        variant="outline"
        @click="addPoint"
      >
        <Plus class="mr-1 size-4" />
        Añadir punto
      </Button>
    </div>
  </div>
</template>
