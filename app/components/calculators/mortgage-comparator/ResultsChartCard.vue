<script setup lang="ts">
import { Loader2 } from '@lucide/vue'
import type { MortgageResult } from '~/lib/mortgage/calculate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { compactCurrencyFormatter, currencyFormatter } from '~/composables/useMortgageComparator'

const { comparison, isLoading } = useMortgageComparator()
const { t } = useI18n()

type SeriesKey = 'installment' | 'cumulativeCost' | 'outstanding' | 'netWorth'

const CHART_KEYS: SeriesKey[] = ['installment', 'cumulativeCost', 'outstanding', 'netWorth']

const CHARTS = computed(() => CHART_KEYS.map(key => ({
  key,
  label: t(`mortgage.charts.${key}`),
  description: t(`mortgage.charts.${key}Description`),
})))

const activeChart = ref<SeriesKey>('cumulativeCost')

const enabledResults = computed<MortgageResult[]>(() =>
  (comparison.value?.results ?? []).filter(result => result.mortgage.enabled),
)

const activeChartMeta = computed(() => CHARTS.value.find(chart => chart.key === activeChart.value)!)

const chartOption = computed(() => {
  const results = enabledResults.value
  if (!results.length) return {}

  const maxYears = comparison.value?.maxYears ?? 0
  const axis = Array.from({ length: maxYears + 1 }, (_, year) => year)
  const crossoverYear = activeChart.value === 'cumulativeCost' ? comparison.value?.crossoverYear ?? null : null

  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => currencyFormatter().format(value),
    },
    legend: { top: 0, type: 'scroll' },
    grid: { left: 80, right: 20, bottom: 40, top: 40 },
    xAxis: {
      type: 'category',
      data: axis,
      name: t('common.year'),
      nameLocation: 'middle',
      nameGap: 26,
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => compactCurrencyFormatter().format(value),
      },
    },
    series: results.map((result, index) => ({
      name: result.mortgage.name,
      type: 'line',
      data: result.yearly[activeChart.value],
      smooth: 0.2,
      symbol: 'none',
      lineStyle: { color: result.mortgage.color },
      itemStyle: { color: result.mortgage.color },
      // The crossover marker belongs to a single series so it is drawn once
      markLine: crossoverYear && index === 0
        ? {
            silent: true,
            symbol: 'none',
            label: { formatter: t('mortgage.charts.crossoverLabel', { year: crossoverYear }), position: 'insideEndTop' },
            lineStyle: { type: 'dashed' },
            data: [{ xAxis: crossoverYear }],
          }
        : undefined,
    })),
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">
        {{ activeChartMeta.label }}
      </CardTitle>
      <CardDescription>{{ activeChartMeta.description }}</CardDescription>
    </CardHeader>
    <CardContent class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="chart in CHARTS"
          :key="chart.key"
          size="sm"
          :variant="activeChart === chart.key ? 'default' : 'outline'"
          @click="activeChart = chart.key"
        >
          {{ chart.label }}
        </Button>
      </div>

      <div
        v-if="isLoading"
        class="flex items-center justify-center py-20"
      >
        <Loader2 class="size-8 animate-spin text-muted-foreground" />
        <span class="ml-3 text-muted-foreground">{{ $t('mortgage.charts.calculating') }}</span>
      </div>

      <div
        v-else-if="!enabledResults.length"
        class="py-20 text-center text-sm text-muted-foreground"
      >
        {{ $t('mortgage.charts.empty') }}
      </div>

      <div
        v-else
        style="width: 100%; height: 420px;"
      >
        <VChart
          :option="chartOption"
          autoresize
        />
      </div>
    </CardContent>
  </Card>
</template>
