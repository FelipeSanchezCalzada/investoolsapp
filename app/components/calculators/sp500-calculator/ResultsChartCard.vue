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

const usdFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const chartOption = computed(() => {
  if (!props.results) return {}

  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => usdFormatter.format(value),
    },
    legend: {
      top: 0,
    },
    grid: {
      left: 80,
      right: 20,
      bottom: 30,
      top: 40,
    },
    xAxis: {
      type: 'category',
      data: props.results.labels,
      axisLabel: {
        interval: (index: number) => props.results!.labels[index] !== '',
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => usdFormatter.format(value),
      },
    },
    series: [
      {
        name: 'Dinero invertido',
        type: 'line',
        data: props.results.invested,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#6b7280' },
        itemStyle: { color: '#6b7280' },
      },
      {
        name: 'Peor caso histórico',
        type: 'line',
        data: props.results.worstCase,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#ef4444' },
        itemStyle: { color: '#ef4444' },
      },
      {
        name: 'Caso actual',
        type: 'line',
        data: props.results.currentCase,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
      },
      {
        name: 'Mejor caso histórico',
        type: 'line',
        data: props.results.bestCase,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#22c55e' },
        itemStyle: { color: '#22c55e' },
      },
    ],
  }
})

const finalSummary = computed(() => {
  if (!props.results) return null
  const last = (arr: number[]) => arr[arr.length - 1]!
  return {
    invested: usdFormatter.format(last(props.results.invested)),
    worstCase: usdFormatter.format(last(props.results.worstCase)),
    bestCase: usdFormatter.format(last(props.results.bestCase)),
    currentCase: usdFormatter.format(last(props.results.currentCase)),
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
        <div style="width: 100%; height: 500px;">
          <VChart
            :option="chartOption"
            autoresize
          />
        </div>

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
