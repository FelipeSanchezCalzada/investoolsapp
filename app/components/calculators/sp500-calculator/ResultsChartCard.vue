<script setup lang="ts">
import { Loader2, TrendingDown, TrendingUp, Wallet, Activity } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const { isLoading, results } = useSP500Calculator()

const usdFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const chartOption = computed(() => {
  if (!results.value) return {}

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
      data: results.value.labels,
      axisLabel: {
        interval: (index: number) => results.value!.labels[index] !== '',
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
        data: results.value.invested,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#6b7280' },
        itemStyle: { color: '#6b7280' },
      },
      {
        name: 'Peor caso histórico',
        type: 'line',
        data: results.value.worstCase,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#ef4444' },
        itemStyle: { color: '#ef4444' },
      },
      {
        name: 'Caso actual',
        type: 'line',
        data: results.value.currentCase,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
      },
      {
        name: 'Mejor caso histórico',
        type: 'line',
        data: results.value.bestCase,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#22c55e' },
        itemStyle: { color: '#22c55e' },
      },
    ],
  }
})

function caseStats(finalValue: number, invested: number) {
  const profit = finalValue - invested
  const multiplier = invested > 0 ? finalValue / invested : 0
  return {
    total: usdFormatter.format(finalValue),
    profit: usdFormatter.format(profit),
    multiplier: `x${multiplier.toFixed(1)}`,
    isNegative: profit < 0,
  }
}

const finalSummary = computed(() => {
  if (!results.value) return null
  const last = (arr: number[]) => arr[arr.length - 1]!
  const invested = last(results.value.invested)
  return {
    invested: usdFormatter.format(invested),
    worstCase: caseStats(last(results.value.worstCase), invested),
    bestCase: caseStats(last(results.value.bestCase), invested),
    currentCase: caseStats(last(results.value.currentCase), invested),
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
        v-if="isLoading"
        class="flex items-center justify-center py-20"
      >
        <Loader2 class="size-8 animate-spin text-muted-foreground" />
        <span class="ml-3 text-muted-foreground">Calculando escenarios...</span>
      </div>

      <div
        v-else-if="!results"
        class="text-center py-20 text-muted-foreground"
      >
        Cargando datos históricos...
      </div>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          <div class="rounded-lg border bg-muted/40 p-2 sm:p-3">
            <div class="flex items-center justify-between mb-1 sm:mb-2">
              <div class="flex items-center gap-2 text-muted-foreground">
                <Wallet class="size-4" />
                <span class="text-xs font-medium">Invertido</span>
              </div>
              <Badge
                variant="outline"
                class="text-xs px-1.5 py-0 invisible"
              >
                &nbsp;
              </Badge>
            </div>
            <p class="text-lg font-bold tracking-tight">
              {{ finalSummary!.invested }}
            </p>
          </div>

          <div class="rounded-lg border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 p-2 sm:p-3">
            <div class="flex items-center justify-between mb-1 sm:mb-2">
              <div class="flex items-center gap-2 text-red-500">
                <TrendingDown class="size-4" />
                <span class="text-xs font-medium">Peor caso</span>
              </div>
              <Badge
                variant="outline"
                class="text-xs px-1.5 py-0 border-red-500/30 text-red-500"
              >
                {{ results!.worstCaseRange.startYear }} – {{ results!.worstCaseRange.endYear }}
              </Badge>
            </div>
            <p class="text-lg font-bold tracking-tight text-red-500">
              {{ finalSummary!.worstCase.total }}
            </p>
            <div class="flex items-center gap-2 mt-1 text-xs text-red-500/80">
              <span class="font-semibold">{{ finalSummary!.worstCase.multiplier }}</span>
              <span>{{ finalSummary!.worstCase.profit }} ganancia</span>
            </div>
          </div>

          <div class="rounded-lg border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 p-2 sm:p-3">
            <div class="flex items-center justify-between mb-1 sm:mb-2">
              <div class="flex items-center gap-2 text-blue-500">
                <Activity class="size-4" />
                <span class="text-xs font-medium">Caso actual</span>
              </div>
              <Badge
                variant="outline"
                class="text-xs px-1.5 py-0 border-blue-500/30 text-blue-500"
              >
                {{ results!.currentCaseRange.startYear }} – {{ results!.currentCaseRange.endYear }}
              </Badge>
            </div>
            <p class="text-lg font-bold tracking-tight text-blue-500">
              {{ finalSummary!.currentCase.total }}
            </p>
            <div class="flex items-center gap-2 mt-1 text-xs text-blue-500/80">
              <span class="font-semibold">{{ finalSummary!.currentCase.multiplier }}</span>
              <span>{{ finalSummary!.currentCase.profit }} ganancia</span>
            </div>
          </div>

          <div class="rounded-lg border border-green-500/20 bg-green-500/5 dark:bg-green-500/10 p-2 sm:p-3">
            <div class="flex items-center justify-between mb-1 sm:mb-2">
              <div class="flex items-center gap-2 text-green-500">
                <TrendingUp class="size-4" />
                <span class="text-xs font-medium">Mejor caso</span>
              </div>
              <Badge
                variant="outline"
                class="text-xs px-1.5 py-0 border-green-500/30 text-green-500"
              >
                {{ results!.bestCaseRange.startYear }} – {{ results!.bestCaseRange.endYear }}
              </Badge>
            </div>
            <p class="text-lg font-bold tracking-tight text-green-500">
              {{ finalSummary!.bestCase.total }}
            </p>
            <div class="flex items-center gap-2 mt-1 text-xs text-green-500/80">
              <span class="font-semibold">{{ finalSummary!.bestCase.multiplier }}</span>
              <span>{{ finalSummary!.bestCase.profit }} ganancia</span>
            </div>
          </div>
        </div>

        <div style="width: 100%; height: 500px;">
          <VChart
            :option="chartOption"
            autoresize
          />
        </div>
      </template>
    </CardContent>
  </Card>
</template>
