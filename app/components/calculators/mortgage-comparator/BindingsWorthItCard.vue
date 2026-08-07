<script setup lang="ts">
import { CircleCheck, CircleX, TriangleAlert } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatPp } from '~/composables/useMortgageComparator'

const { comparison } = useMortgageComparator()

const rows = computed(() =>
  (comparison.value?.results ?? [])
    .filter(result => result.mortgage.enabled)
    .flatMap(result => result.bindingsWorthiness.map(worthiness => ({
      mortgageId: result.mortgage.id,
      mortgageName: result.mortgage.name,
      color: result.mortgage.color,
      ...worthiness,
    }))),
)
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="text-lg">
        ¿Compensan las vinculaciones?
      </CardTitle>
      <CardDescription>
        Para cada producto se recalcula la hipoteca con y sin él. Compensa si lo que ahorras en
        intereses gracias a la bonificación supera su coste neto acumulado. El umbral de ruptura es
        el coste neto máximo al que dejaría de compensar.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div
        v-if="!rows.length"
        class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground"
      >
        Ninguna hipoteca activa tiene vinculaciones.
      </div>

      <div v-else>
        <Table class="min-w-4xl">
          <TableHeader>
            <TableRow>
              <TableHead class="min-w-40">
                Hipoteca
              </TableHead>
              <TableHead class="min-w-48">
                Vinculación
              </TableHead>
              <TableHead class="text-right">
                Bonificación
              </TableHead>
              <TableHead class="text-right">
                Ahorro en intereses
              </TableHead>
              <TableHead class="text-right">
                Coste neto
              </TableHead>
              <TableHead class="text-right">
                Balance
              </TableHead>
              <TableHead class="text-right">
                Umbral de ruptura
              </TableHead>
              <TableHead class="w-28 text-center">
                Veredicto
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in rows"
              :key="`${row.mortgageId}-${row.bindingId}`"
              :class="row.active ? '' : 'opacity-60'"
            >
              <TableCell>
                <div class="flex items-center gap-2">
                  <span
                    class="size-2.5 shrink-0 rounded-full"
                    :style="{ backgroundColor: row.color }"
                  />
                  <span class="whitespace-nowrap">{{ row.mortgageName }}</span>
                </div>
              </TableCell>
              <TableCell class="font-medium">
                <div class="flex items-center gap-2">
                  {{ row.name }}
                  <Badge
                    v-if="row.required"
                    variant="outline"
                    class="text-[10px]"
                  >
                    Obligatoria
                  </Badge>
                  <TriangleAlert
                    v-if="row.required && !row.active"
                    class="size-4 text-amber-500"
                  />
                </div>
                <p
                  v-if="!row.active"
                  class="text-xs text-muted-foreground"
                >
                  Desactivada: cifras de qué pasaría si la contrataras.
                </p>
              </TableCell>
              <TableCell class="text-right">
                −{{ formatPp(row.rateReductionPp) }}
              </TableCell>
              <TableCell class="text-right">
                {{ formatCurrency(row.interestSavings) }}
              </TableCell>
              <TableCell
                class="text-right"
                :class="row.netCost < 0 ? 'text-green-600 dark:text-green-400' : ''"
              >
                {{ formatCurrency(row.netCost) }}
              </TableCell>
              <TableCell
                class="text-right font-medium"
                :class="row.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
              >
                {{ formatCurrency(row.balance) }}
              </TableCell>
              <TableCell class="text-right text-muted-foreground">
                {{ formatCurrency(row.breakEvenCost) }}
              </TableCell>
              <TableCell class="text-center">
                <span
                  class="inline-flex items-center gap-1 text-sm font-medium"
                  :class="row.worthIt ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                >
                  <component
                    :is="row.worthIt ? CircleCheck : CircleX"
                    class="size-4"
                  />
                  {{ row.worthIt ? 'Sí' : 'No' }}
                </span>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</template>
