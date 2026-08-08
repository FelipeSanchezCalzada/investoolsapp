<script setup lang="ts">
import type { MortgageResult } from '~/lib/mortgage/calculate'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency, formatPercent } from '~/composables/useMortgageComparator'

const props = defineProps<{ result: MortgageResult | null }>()

const showOnlyYearEnds = ref(false)

const rows = computed(() => {
  const schedule = props.result?.simulation.schedule ?? []
  if (!showOnlyYearEnds.value) return schedule
  return schedule.filter((row, index) => row.month % 12 === 0 || index === schedule.length - 1)
})
</script>

<template>
  <Dialog>
    <DialogTrigger asChild>
      <Button
        size="sm"
        variant="outline"
        :disabled="!result"
      >
        {{ $t('mortgage.amortization.open') }}
      </Button>
    </DialogTrigger>
    <DialogContent class="flex max-h-[90dvh] flex-col gap-3 overflow-hidden sm:max-w-5xl">
      <DialogHeader>
        <DialogTitle>{{ $t('mortgage.amortization.title', { name: result?.mortgage.name }) }}</DialogTitle>
        <DialogDescription>
          {{ $t('mortgage.amortization.description') }}
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          :variant="showOnlyYearEnds ? 'default' : 'outline'"
          @click="showOnlyYearEnds = !showOnlyYearEnds"
        >
          {{ $t('mortgage.amortization.onlyYearEnds') }}
        </Button>
        <Badge variant="outline">
          {{ $t('mortgage.amortization.monthsBadge', { count: result?.simulation.months ?? 0 }) }}
        </Badge>
        <Badge
          v-if="result?.simulation.cancelledEarly"
          variant="outline"
          class="border-green-500/40 text-green-600 dark:text-green-400"
        >
          {{ $t('mortgage.amortization.cancelledEarly') }}
        </Badge>
        <Badge
          v-if="(result?.simulation.financedPremiums ?? 0) > 0"
          variant="outline"
        >
          {{ $t('mortgage.amortization.financedPremiums', { value: formatCurrency(result?.simulation.financedPremiums) }) }}
        </Badge>
      </div>

      <div class="max-h-[60dvh] overflow-auto rounded-lg border">
        <Table class="min-w-4xl">
          <TableHeader class="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-background [&_th]:whitespace-nowrap">
            <TableRow>
              <TableHead class="w-16">
                {{ $t('common.month') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('mortgage.amortization.baseRate') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('mortgage.amortization.appliedRate') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('mortgage.amortization.installment') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('mortgage.amortization.interest') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('mortgage.amortization.principal') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('mortgage.amortization.prepayment') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('mortgage.amortization.fee') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('mortgage.amortization.bindings') }}
              </TableHead>
              <TableHead class="text-right">
                {{ $t('mortgage.amortization.outstanding') }}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="row in rows"
              :key="row.month"
              :class="row.month % 12 === 0 ? 'bg-muted/40' : ''"
            >
              <TableCell class="font-medium">
                {{ row.month }}
              </TableCell>
              <TableCell class="text-right text-muted-foreground">
                {{ formatPercent(row.baseRatePct) }}
              </TableCell>
              <TableCell class="text-right">
                {{ formatPercent(row.appliedRatePct) }}
              </TableCell>
              <TableCell class="text-right">
                {{ formatCurrency(row.installment) }}
              </TableCell>
              <TableCell class="text-right">
                {{ formatCurrency(row.interest) }}
              </TableCell>
              <TableCell class="text-right">
                {{ formatCurrency(row.principalPaid) }}
              </TableCell>
              <TableCell class="text-right">
                {{ row.prepayment ? formatCurrency(row.prepayment) : '—' }}
              </TableCell>
              <TableCell class="text-right">
                {{ row.prepaymentFee ? formatCurrency(row.prepaymentFee) : '—' }}
              </TableCell>
              <TableCell
                class="text-right"
                :class="row.bindingNetCost < 0 ? 'text-green-600 dark:text-green-400' : ''"
              >
                {{ row.bindingNetCost ? formatCurrency(row.bindingNetCost) : '—' }}
              </TableCell>
              <TableCell class="text-right font-medium">
                {{ formatCurrency(row.outstanding) }}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  </Dialog>
</template>
