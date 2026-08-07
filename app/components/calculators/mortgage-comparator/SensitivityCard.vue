<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPercent } from '~/composables/useMortgageComparator'

const { comparator, comparison, scenarios } = useMortgageComparator()

const rows = computed(() =>
  (comparison.value?.results ?? []).filter(result => result.mortgage.enabled),
)

/** Best APR of each scenario, to highlight who wins if the Euribor moves. */
const bestByScenario = computed(() => {
  const best: Record<string, string | null> = {}
  for (const scenario of scenarios.value) {
    let winnerId: string | null = null
    let winnerApr = Number.POSITIVE_INFINITY
    for (const result of rows.value) {
      const apr = result.aprByScenarioId[scenario.id]
      if (apr === null || apr === undefined || !result.viable) continue
      if (apr < winnerApr) {
        winnerApr = apr
        winnerId = result.mortgage.id
      }
    }
    best[scenario.id] = winnerId
  }
  return best
})

function spreadOf(mortgageId: string): number | null {
  const result = rows.value.find(item => item.mortgage.id === mortgageId)
  if (!result) return null
  const values = scenarios.value
    .map(scenario => result.aprByScenarioId[scenario.id])
    .filter((value): value is number => value !== null && value !== undefined)
  if (values.length < 2) return null
  return Math.max(...values) - Math.min(...values)
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">
        Sensibilidad al Euríbor
      </CardTitle>
      <CardDescription>
        TAE real de cada oferta en cada escenario del índice. Una fija apenas se mueve; en una
        variable la horquilla es la medida del riesgo que asumes.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div
        v-if="!rows.length"
        class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground"
      >
        No hay hipotecas activas.
      </div>

      <div v-else>
        <Table class="min-w-3xl">
          <TableHeader>
            <TableRow>
              <TableHead class="min-w-40">
                Hipoteca
              </TableHead>
              <TableHead
                v-for="scenario in scenarios"
                :key="scenario.id"
                class="text-right whitespace-nowrap"
              >
                {{ scenario.name }}
                <Badge
                  v-if="scenario.id === comparator?.selectedScenarioId"
                  variant="outline"
                  class="ml-1 text-[10px]"
                >
                  activo
                </Badge>
              </TableHead>
              <TableHead class="text-right">
                Horquilla
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="result in rows"
              :key="result.mortgage.id"
            >
              <TableCell class="font-medium">
                <div class="flex items-center gap-2">
                  <span
                    class="size-2.5 shrink-0 rounded-full"
                    :style="{ backgroundColor: result.mortgage.color }"
                  />
                  <span class="whitespace-nowrap">{{ result.mortgage.name }}</span>
                </div>
              </TableCell>
              <TableCell
                v-for="scenario in scenarios"
                :key="scenario.id"
                class="text-right"
                :class="bestByScenario[scenario.id] === result.mortgage.id
                  ? 'font-semibold text-green-600 dark:text-green-400'
                  : ''"
              >
                {{ formatPercent(result.aprByScenarioId[scenario.id]) }}
              </TableCell>
              <TableCell class="text-right text-muted-foreground">
                {{ formatPercent(spreadOf(result.mortgage.id), ' pp') }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p class="mt-3 text-xs text-muted-foreground">
        En verde, la oferta ganadora dentro de cada escenario. Si cambia de una columna a otra, la
        decisión depende de por dónde vaya el Euríbor y no solo de la oferta.
      </p>
    </CardContent>
  </Card>
</template>
