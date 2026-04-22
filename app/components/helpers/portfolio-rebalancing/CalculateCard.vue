<script setup lang="ts">
import { ArrowRightLeft } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  NumberField,
  NumberFieldContent,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import type { Workspace } from '~/db/types'
import useFrontDB from '~/db/useFrontDB'

type PortfolioRebalancingHelper = NonNullable<Workspace['portfolioRebalancingHelper']>
type Transfer = PortfolioRebalancingHelper['dcaTransfers'][number][number]

const { selectedWorkspace } = storeToRefs(useFrontDB())

const portfolio = computed<PortfolioRebalancingHelper | null>(() =>
  selectedWorkspace.value?.portfolioRebalancingHelper ?? null,
)

const dcaParts = ref(1)

const totalCurrentAmount = computed(() =>
  (portfolio.value?.current ?? []).reduce((sum, f) => sum + (f.amount || 0), 0),
)

const totalTargetPercentage = computed(() =>
  (portfolio.value?.target ?? []).reduce((sum, f) => sum + (f.percentage || 0), 0),
)

const isTargetValid = computed(() =>
  Math.abs(totalTargetPercentage.value - 100) < 0.01,
)

const canCalculate = computed(() =>
  (portfolio.value?.current.length ?? 0) > 0
  && (portfolio.value?.target.length ?? 0) > 0
  && totalCurrentAmount.value > 0
  && isTargetValid.value,
)

function calculateRebalancing() {
  if (!canCalculate.value || !portfolio.value) return

  const total = totalCurrentAmount.value

  const fundMap = new Map<string, { name: string, current: number, target: number }>()

  for (const f of portfolio.value.current) {
    fundMap.set(f.isin, {
      name: f.name,
      current: f.amount,
      target: 0,
    })
  }

  for (const f of portfolio.value.target) {
    const targetAmount = total * (f.percentage / 100)
    if (fundMap.has(f.isin)) {
      fundMap.get(f.isin)!.target = targetAmount
      if (f.name) fundMap.get(f.isin)!.name = f.name
    } else {
      fundMap.set(f.isin, {
        name: f.name,
        current: 0,
        target: targetAmount,
      })
    }
  }

  const sources: { isin: string, name: string, excess: number }[] = []
  const destinations: { isin: string, name: string, needed: number }[] = []

  for (const [isin, data] of fundMap) {
    const diff = data.target - data.current
    if (diff < -0.01) {
      sources.push({ isin, name: data.name, excess: -diff })
    } else if (diff > 0.01) {
      destinations.push({ isin, name: data.name, needed: diff })
    }
  }

  sources.sort((a, b) => b.excess - a.excess)
  destinations.sort((a, b) => b.needed - a.needed)

  const fullTransfers: Transfer[] = []
  let si = 0
  let di = 0

  while (si < sources.length && di < destinations.length) {
    const source = sources[si]!
    const dest = destinations[di]!
    const transferAmount = Math.min(source.excess, dest.needed)

    if (transferAmount > 0.01) {
      fullTransfers.push({
        fromName: source.name,
        fromIsin: source.isin,
        toName: dest.name,
        toIsin: dest.isin,
        amount: Math.round(transferAmount * 100) / 100,
        done: false,
      })
    }

    source.excess -= transferAmount
    dest.needed -= transferAmount

    if (source.excess < 0.01) si++
    if (dest.needed < 0.01) di++
  }

  const parts = Math.max(1, dcaParts.value)
  const result: Transfer[][] = []

  for (let p = 0; p < parts; p++) {
    result.push(fullTransfers.map(t => ({
      ...t,
      amount: Math.round((t.amount / parts) * 100) / 100,
      done: false,
    })))
  }

  portfolio.value.dcaTransfers = result

  const totalTransfers = fullTransfers.length
  if (totalTransfers === 0) {
    toast.success('Tu cartera ya está balanceada')
  } else {
    toast.success('Traspasos calculados')
  }
}
</script>

<template>
  <Card>
    <CardContent class="pt-6">
      <div class="flex flex-col sm:flex-row items-center gap-4 justify-center">
        <div class="flex items-center gap-3">
          <label
            for="dca-parts"
            class="text-sm font-medium whitespace-nowrap"
          >
            Dividir en partes (DCA)
          </label>
          <NumberField
            id="dca-parts"
            v-model="dcaParts"
            :min="1"
            :max="24"
            :step="1"
            class="w-36"
          >
            <NumberFieldContent>
              <NumberFieldDecrement />
              <NumberFieldInput />
              <NumberFieldIncrement />
            </NumberFieldContent>
          </NumberField>
        </div>
        <Button
          size="lg"
          :disabled="!canCalculate"
          @click="calculateRebalancing"
        >
          <ArrowRightLeft class="size-4 mr-2" />
          Calcular traspasos
        </Button>
      </div>
      <p class="text-xs text-muted-foreground text-center mt-3">
        {{ dcaParts > 1
          ? `Los traspasos se dividirán en ${dcaParts} partes iguales para hacer DCA.`
          : 'Se calculará un único traspaso por movimiento.'
        }}
      </p>
    </CardContent>
  </Card>
</template>
