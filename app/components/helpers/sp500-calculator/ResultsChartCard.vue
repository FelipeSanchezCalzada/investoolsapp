<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = defineProps<{
  isCalculating: boolean
  results: {
    labels: string[]
    invested: number[]
    worstCase: number[]
    bestCase: number[]
    currentCase: number[]
  } | null
}>()

const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const finalSummary = computed(() => {
  if (!props.results) return null
  const last = (arr: number[]) => arr[arr.length - 1]!
  return {
    invested: euroFormatter.format(last(props.results.invested)),
    worstCase: euroFormatter.format(last(props.results.worstCase)),
    bestCase: euroFormatter.format(last(props.results.bestCase)),
    currentCase: euroFormatter.format(last(props.results.currentCase)),
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">
        Resultados
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div
        v-if="isCalculating"
        class="flex items-center justify-center py-20"
      >
        <Loader2 class="size-8 animate-spin text-muted-foreground" />
        <span class="ml-3 text-muted-foreground">Calculando escenarios...</span>
      </div>

      <div
        v-else-if="!results"
        class="text-center py-20 text-muted-foreground"
      >
        Introduce los datos y pulsa "Calcular" para ver los resultados.
      </div>

      <template v-else>
        <!-- TODO: Gráfico echarts aquí -->

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div class="rounded-lg border p-3 text-center">
            <p class="text-xs text-muted-foreground">
              Invertido
            </p>
            <p class="text-sm font-semibold text-gray-500">
              {{ finalSummary!.invested }}
            </p>
          </div>
          <div class="rounded-lg border p-3 text-center border-red-200 dark:border-red-900">
            <p class="text-xs text-muted-foreground">
              Peor caso
            </p>
            <p class="text-sm font-semibold text-red-500">
              {{ finalSummary!.worstCase }}
            </p>
          </div>
          <div class="rounded-lg border p-3 text-center border-blue-200 dark:border-blue-900">
            <p class="text-xs text-muted-foreground">
              Caso actual
            </p>
            <p class="text-sm font-semibold text-blue-500">
              {{ finalSummary!.currentCase }}
            </p>
          </div>
          <div class="rounded-lg border p-3 text-center border-green-200 dark:border-green-900">
            <p class="text-xs text-muted-foreground">
              Mejor caso
            </p>
            <p class="text-sm font-semibold text-green-500">
              {{ finalSummary!.bestCase }}
            </p>
          </div>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
