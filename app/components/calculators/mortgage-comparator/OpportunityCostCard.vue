<script setup lang="ts">
import { TriangleAlert } from '@lucide/vue'
import type { MortgageResult } from '~/lib/mortgage/calculate'
import { formatCurrency, formatPercent } from '~/composables/useMortgageComparator'

defineProps<{ result: MortgageResult | null }>()

const { common } = useMortgageComparator()
</script>

<template>
  <div
    v-if="!result"
    class="text-sm text-muted-foreground"
  >
    Sin datos todavía.
  </div>

  <div
    v-else-if="!common?.opportunityCostEnabled"
    class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground"
  >
    El coste de oportunidad está desactivado. Actívalo en los datos comunes para simular qué pasa
    con el ahorro que no metes en la entrada.
  </div>

  <div
    v-else
    class="flex flex-col gap-4"
  >
    <p class="text-xs text-muted-foreground">
      Pedir menos capital ahorra intereses pero inmoviliza ahorro. Aquí se simula la otra mitad:
      el dinero que esta oferta te deja libre, invertido al
      {{ formatPercent(common.expectedReturnPct) }} durante {{ result.years }} años y tributando
      al {{ formatPercent(common.capitalGainsTaxPct) }} al rescatarlo. La rentabilidad y el
      impuesto se editan en los datos comunes.
    </p>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div class="rounded-lg border bg-muted/40 p-3">
        <p class="text-xs text-muted-foreground">
          Entrada aportada
        </p>
        <p class="text-lg font-semibold tracking-tight">
          {{ formatCurrency(result.opportunityCost.downPayment) }}
        </p>
        <p class="text-xs text-muted-foreground">
          Vivienda − capital
        </p>
      </div>

      <div class="rounded-lg border bg-muted/40 p-3">
        <p class="text-xs text-muted-foreground">
          Capital libre
        </p>
        <p class="text-lg font-semibold tracking-tight">
          {{ formatCurrency(result.opportunityCost.freeCapital) }}
        </p>
        <p class="text-xs text-muted-foreground">
          Ahorro − entrada − gastos
        </p>
      </div>

      <div class="rounded-lg border bg-muted/40 p-3">
        <p class="text-xs text-muted-foreground">
          Cartera final neta
        </p>
        <p class="text-lg font-semibold tracking-tight">
          {{ formatCurrency(result.opportunityCost.netPortfolio) }}
        </p>
        <p class="text-xs text-muted-foreground">
          Impuesto: {{ formatCurrency(result.opportunityCost.capitalGainsTax) }}
        </p>
      </div>

      <div class="rounded-lg border border-primary/40 bg-primary/5 p-3">
        <p class="text-xs text-muted-foreground">
          Patrimonio neto
        </p>
        <p
          class="text-lg font-semibold tracking-tight"
          :class="result.netWorth < 0 ? 'text-red-600 dark:text-red-400' : ''"
        >
          {{ formatCurrency(result.netWorth) }}
        </p>
        <p class="text-xs text-muted-foreground">
          Cartera neta − coste total
        </p>
      </div>
    </div>

    <div
      v-if="result.opportunityCost.notAffordable || result.opportunityCost.negativeDownPayment"
      class="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
    >
      <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-500" />
      <span v-if="result.opportunityCost.negativeDownPayment">
        El capital de esta oferta supera el precio de la vivienda, así que no hay entrada que
        aportar. Revisa el capital o el precio.
      </span>
      <span v-else>
        Tu ahorro no cubre la entrada más los gastos: te faltan
        {{ formatCurrency(-result.opportunityCost.freeCapital) }}. La oferta queda fuera del
        ranking, pero se sigue calculando.
      </span>
    </div>
  </div>
</template>
