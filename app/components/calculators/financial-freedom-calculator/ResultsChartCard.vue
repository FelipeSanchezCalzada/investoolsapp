<script setup lang="ts">
import { Loader2, TrendingDown, TrendingUp, Activity, Wallet, Clock } from '@lucide/vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const { isLoading, results } = useFinancialFreedomCalculator()
const { t, locale } = useI18n()

const usdFormatter = computed(() => new Intl.NumberFormat(locale.value, {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
}))

const chartOption = computed(() => {
  if (!results.value) return {}

  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => usdFormatter.value.format(value),
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
        interval: 2,
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => usdFormatter.value.format(value),
      },
    },
    series: [
      {
        name: t('financialFreedom.series.worstCaseInvested'),
        type: 'line',
        data: results.value.worstCaseInvested,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#f87171' },
        itemStyle: { color: '#f87171' },
      },
      {
        name: t('financialFreedom.series.currentCaseInvested'),
        type: 'line',
        data: results.value.currentCaseInvested,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#60a5fa' },
        itemStyle: { color: '#60a5fa' },
      },
      {
        name: t('financialFreedom.series.bestCaseInvested'),
        type: 'line',
        data: results.value.bestCaseInvested,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#4ade80' },
        itemStyle: { color: '#4ade80' },
      },
      {
        name: t('financialFreedom.series.worstCase'),
        type: 'line',
        data: results.value.worstCasePortfolio,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#ef4444' },
        itemStyle: { color: '#ef4444' },
      },
      {
        name: t('financialFreedom.series.currentCase'),
        type: 'line',
        data: results.value.currentCasePortfolio,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#3b82f6' },
        itemStyle: { color: '#3b82f6' },
      },
      {
        name: t('financialFreedom.series.bestCase'),
        type: 'line',
        data: results.value.bestCasePortfolio,
        smooth: 0.4,
        symbol: 'none',
        lineStyle: { color: '#22c55e' },
        itemStyle: { color: '#22c55e' },
      },
    ],
  }
})
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">
        {{ $t('common.results') }}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div
        v-if="isLoading"
        class="flex items-center justify-center py-20"
      >
        <Loader2 class="size-8 animate-spin text-muted-foreground" />
        <span class="ml-3 text-muted-foreground">{{ $t('financialFreedom.calculating') }}</span>
      </div>

      <div
        v-else-if="!results"
        class="text-center py-20 text-muted-foreground"
      >
        {{ $t('financialFreedom.loading') }}
      </div>

      <template v-else>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          <div class="rounded-lg border bg-muted/40 p-2 sm:p-3">
            <div class="flex items-center justify-between mb-1 sm:mb-2">
              <div class="flex items-center gap-2 text-muted-foreground">
                <Wallet class="size-4" />
                <span class="text-xs font-medium">{{ $t('financialFreedom.totalInvested') }}</span>
              </div>
            </div>
            <p class="text-lg font-bold tracking-tight">
              {{ usdFormatter.format(results.worstCase.timeline[results.worstCase.timeline.length - 1]?.invested ?? 0) }}
            </p>
          </div>

          <div class="rounded-lg border border-red-500/20 bg-red-500/5 dark:bg-red-500/10 p-2 sm:p-3">
            <div class="flex items-center justify-between mb-1 sm:mb-2">
              <div class="flex items-center gap-2 text-red-500">
                <TrendingDown class="size-4" />
                <span class="text-xs font-medium">{{ $t('financialFreedom.worstCase') }}</span>
              </div>
              <Badge
                variant="outline"
                class="text-xs px-1.5 py-0 border-red-500/30 text-red-500"
              >
                {{ results.worstCase.range.startYear }} - {{ results.worstCase.range.endYear }}
              </Badge>
            </div>
            <div class="flex items-center gap-2">
              <Clock class="size-4 text-red-500" />
              <p class="text-lg font-bold tracking-tight text-red-500">
                {{ $t('common.yearsCount', { count: results.worstCase.yearsToFreedom }) }}
              </p>
            </div>
            <p class="text-xs text-red-500/80 mt-1">
              {{ $t('financialFreedom.freedomAtAge', { age: results.worstCase.ageAtFreedom }) }}
            </p>
          </div>

          <div class="rounded-lg border border-blue-500/20 bg-blue-500/5 dark:bg-blue-500/10 p-2 sm:p-3">
            <div class="flex items-center justify-between mb-1 sm:mb-2">
              <div class="flex items-center gap-2 text-blue-500">
                <Activity class="size-4" />
                <span class="text-xs font-medium">{{ $t('financialFreedom.currentCase') }}</span>
              </div>
              <Badge
                variant="outline"
                class="text-xs px-1.5 py-0 border-blue-500/30 text-blue-500"
              >
                {{ results.currentCase.range.startYear }} - {{ results.currentCase.range.endYear }}
              </Badge>
            </div>
            <div class="flex items-center gap-2">
              <Clock class="size-4 text-blue-500" />
              <p class="text-lg font-bold tracking-tight text-blue-500">
                {{ $t('common.yearsCount', { count: results.currentCase.yearsToFreedom }) }}
              </p>
            </div>
            <p class="text-xs text-blue-500/80 mt-1">
              {{ $t('financialFreedom.freedomAtAge', { age: results.currentCase.ageAtFreedom }) }}
            </p>
          </div>

          <div class="rounded-lg border border-green-500/20 bg-green-500/5 dark:bg-green-500/10 p-2 sm:p-3">
            <div class="flex items-center justify-between mb-1 sm:mb-2">
              <div class="flex items-center gap-2 text-green-500">
                <TrendingUp class="size-4" />
                <span class="text-xs font-medium">{{ $t('financialFreedom.bestCase') }}</span>
              </div>
              <Badge
                variant="outline"
                class="text-xs px-1.5 py-0 border-green-500/30 text-green-500"
              >
                {{ results.bestCase.range.startYear }} - {{ results.bestCase.range.endYear }}
              </Badge>
            </div>
            <div class="flex items-center gap-2">
              <Clock class="size-4 text-green-500" />
              <p class="text-lg font-bold tracking-tight text-green-500">
                {{ $t('common.yearsCount', { count: results.bestCase.yearsToFreedom }) }}
              </p>
            </div>
            <p class="text-xs text-green-500/80 mt-1">
              {{ $t('financialFreedom.freedomAtAge', { age: results.bestCase.ageAtFreedom }) }}
            </p>
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
