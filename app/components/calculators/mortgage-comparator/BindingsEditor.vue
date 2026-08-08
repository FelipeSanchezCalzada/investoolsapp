<script setup lang="ts">
import { Pencil, Plus, TriangleAlert, Trash2, Wand2 } from '@lucide/vue'
import type { MortgageBinding } from '~/db/types/FrontDBv3'
import type { MortgageResult } from '~/lib/mortgage/calculate'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import BindingFormDialog from '~/components/calculators/mortgage-comparator/BindingFormDialog.vue'
import { BINDING_CATALOG, bindingCostModeKey, bindingLabelKey, createBindingFromCatalog } from '~/lib/mortgage/bindingCatalog'
import { formatCurrency, formatPp } from '~/composables/useMortgageComparator'

const props = defineProps<{ mortgageId: string, result: MortgageResult | null }>()

const { findMortgage, removeBinding } = useMortgageComparator()
const { t } = useI18n()

/** The editors write straight into the store object, so only its id travels as a prop. */
const mortgage = computed(() => findMortgage(props.mortgageId))

const editingBindingId = ref<string | null>(null)

function addFromCatalog(entryType: string) {
  const entry = BINDING_CATALOG.find(item => item.type === entryType)
  if (!entry || !mortgage.value) return
  const binding = createBindingFromCatalog(entry, t(bindingLabelKey(entry.type)))
  mortgage.value.bindings.push(binding)
  editingBindingId.value = binding.id
}

function netCostOf(bindingId: string): number | null {
  return props.result?.bindingsWorthiness.find(item => item.bindingId === bindingId)?.netCost ?? null
}

function bankCostLabel(binding: MortgageBinding): string {
  const cost = binding.cost
  switch (cost.mode) {
    case 'free': return t('common.emptyValue')
    case 'annual': return t('mortgage.bindings.perYear', { value: formatCurrency(cost.bankCost) })
    case 'permille': return `${cost.permille} ‰`
    case 'singlePremium': return formatCurrency(cost.amount)
    case 'investment': return `${cost.bankFeePct} %`
  }
}

function marketCostLabel(binding: MortgageBinding): string {
  const cost = binding.cost
  switch (cost.mode) {
    case 'free': return t('common.emptyValue')
    case 'annual': return t('mortgage.bindings.perYear', { value: formatCurrency(cost.marketCost) })
    case 'permille': return `${cost.marketPermille} ‰`
    case 'singlePremium': return formatCurrency(cost.marketAmount)
    case 'investment': return `${cost.alternativeFeePct} %`
  }
}

function validityLabel(binding: MortgageBinding): string {
  if (binding.fromYear === 0 && binding.toYear === null) return t('mortgage.bindings.lifetime')
  if (binding.toYear === null) return t('mortgage.bindings.fromYear', { year: binding.fromYear })
  return t('mortgage.bindings.yearRange', { from: binding.fromYear, to: binding.toYear - 1 })
}

function openEditor(binding: MortgageBinding) {
  editingBindingId.value = binding.id
}
</script>

<template>
  <div
    v-if="mortgage"
    class="flex flex-col gap-3"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="max-w-2xl text-xs text-muted-foreground">
        {{ $t('mortgage.bindings.note') }}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
          >
            <Plus class="mr-1 size-4" />
            {{ $t('mortgage.bindings.add') }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          class="max-h-96 overflow-y-auto"
        >
          <DropdownMenuItem
            v-for="entry in BINDING_CATALOG"
            :key="entry.type"
            @select="addFromCatalog(entry.type)"
          >
            {{ $t(`mortgage.bindings.catalog.${entry.type}.label`) }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div
      v-if="!mortgage.bindings.length"
      class="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
    >
      {{ $t('mortgage.bindings.empty') }}
    </div>

    <div v-else>
      <Table class="min-w-5xl">
        <TableHeader>
          <TableRow>
            <TableHead class="min-w-52">
              {{ $t('mortgage.bindings.product') }}
            </TableHead>
            <TableHead class="w-20 text-center">
              {{ $t('mortgage.bindings.requiredShort') }}
            </TableHead>
            <TableHead class="w-24 text-right">
              {{ $t('mortgage.bindings.bonusShort') }}
            </TableHead>
            <TableHead class="w-44">
              {{ $t('mortgage.bindings.costModel') }}
            </TableHead>
            <TableHead class="w-32 text-right">
              {{ $t('mortgage.bindings.atBank') }}
            </TableHead>
            <TableHead class="w-32 text-right">
              {{ $t('mortgage.bindings.outside') }}
            </TableHead>
            <TableHead class="w-36 text-right">
              {{ $t('mortgage.bindings.netCostTotal') }}
            </TableHead>
            <TableHead class="w-32">
              {{ $t('mortgage.bindings.validity') }}
            </TableHead>
            <TableHead class="w-20 text-center">
              {{ $t('mortgage.bindings.activeColumn') }}
            </TableHead>
            <TableHead class="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow
            v-for="binding in mortgage.bindings"
            :key="binding.id"
            :class="{ 'opacity-60': !binding.active }"
          >
            <TableCell class="font-medium">
              <div class="flex items-center gap-2">
                {{ binding.name }}
                <TriangleAlert
                  v-if="binding.required && !binding.active"
                  class="size-4 text-amber-500"
                />
              </div>
              <p
                v-if="binding.requirement"
                class="text-xs text-muted-foreground"
              >
                {{ binding.requirement }}
              </p>
            </TableCell>
            <TableCell class="text-center">
              <Badge
                v-if="binding.required"
                variant="outline"
                class="text-[10px]"
              >
                {{ $t('common.yes') }}
              </Badge>
              <span
                v-else
                class="text-muted-foreground"
              >{{ $t('common.emptyValue') }}</span>
            </TableCell>
            <TableCell class="text-right">
              −{{ formatPp(binding.rateReductionPp) }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ $t(bindingCostModeKey(binding.cost.mode)) }}
            </TableCell>
            <TableCell class="text-right">
              {{ bankCostLabel(binding) }}
            </TableCell>
            <TableCell class="text-right">
              {{ marketCostLabel(binding) }}
            </TableCell>
            <TableCell
              class="text-right font-medium"
              :class="(netCostOf(binding.id) ?? 0) < 0 ? 'text-green-600 dark:text-green-400' : ''"
            >
              {{ netCostOf(binding.id) === null ? $t('common.emptyValue') : formatCurrency(netCostOf(binding.id)) }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ validityLabel(binding) }}
            </TableCell>
            <TableCell class="text-center">
              <Switch v-model="binding.active" />
            </TableCell>
            <TableCell>
              <div class="flex justify-end">
                <Button
                  size="icon"
                  variant="ghost"
                  @click="openEditor(binding)"
                >
                  <component
                    :is="binding.cost.mode === 'investment' ? Wand2 : Pencil"
                    class="size-4"
                  />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  class="text-destructive hover:text-destructive"
                  @click="removeBinding(mortgageId, binding.id)"
                >
                  <Trash2 class="size-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>

  <BindingFormDialog
    :bindingId="editingBindingId"
    :mortgageId="mortgageId"
    @close="editingBindingId = null"
  />
</template>
