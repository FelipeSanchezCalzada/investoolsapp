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
import { BINDING_CATALOG, BINDING_COST_MODE_LABELS, createBindingFromCatalog } from '~/lib/mortgage/bindingCatalog'
import { formatCurrency, formatPp } from '~/composables/useMortgageComparator'

const props = defineProps<{ mortgageId: string, result: MortgageResult | null }>()

const { findMortgage, removeBinding } = useMortgageComparator()

/** The editors write straight into the store object, so only its id travels as a prop. */
const mortgage = computed(() => findMortgage(props.mortgageId))

const editingBindingId = ref<string | null>(null)

function addFromCatalog(entryType: string) {
  const entry = BINDING_CATALOG.find(item => item.type === entryType)
  if (!entry || !mortgage.value) return
  const binding = createBindingFromCatalog(entry)
  mortgage.value.bindings.push(binding)
  editingBindingId.value = binding.id
}

function netCostOf(bindingId: string): number | null {
  return props.result?.bindingsWorthiness.find(item => item.bindingId === bindingId)?.netCost ?? null
}

function bankCostLabel(binding: MortgageBinding): string {
  const cost = binding.cost
  switch (cost.mode) {
    case 'free': return '—'
    case 'annual': return `${formatCurrency(cost.bankCost)}/año`
    case 'permille': return `${cost.permille} ‰`
    case 'singlePremium': return formatCurrency(cost.amount)
    case 'investment': return `${cost.bankFeePct} %`
  }
}

function marketCostLabel(binding: MortgageBinding): string {
  const cost = binding.cost
  switch (cost.mode) {
    case 'free': return '—'
    case 'annual': return `${formatCurrency(cost.marketCost)}/año`
    case 'permille': return `${cost.marketPermille} ‰`
    case 'singlePremium': return formatCurrency(cost.marketAmount)
    case 'investment': return `${cost.alternativeFeePct} %`
  }
}

function validityLabel(binding: MortgageBinding): string {
  if (binding.fromYear === 0 && binding.toYear === null) return 'Toda la vida'
  if (binding.toYear === null) return `Desde año ${binding.fromYear}`
  return `Años ${binding.fromYear}–${binding.toYear - 1}`
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
        El coste imputable es siempre el diferencial: lo que cuesta en el banco menos lo que
        gastarías en ese producto si no existiera la hipoteca. Puede salir negativo si el
        producto del banco es más barato que el tuyo.
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
          >
            <Plus class="mr-1 size-4" />
            Añadir vinculación
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
            {{ entry.label }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <div
      v-if="!mortgage.bindings.length"
      class="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground"
    >
      Sin vinculaciones. Añade las que te exija o te ofrezca el banco para ver su coste real.
    </div>

    <div v-else>
      <Table class="min-w-5xl">
        <TableHeader>
          <TableRow>
            <TableHead class="min-w-52">
              Producto
            </TableHead>
            <TableHead class="w-20 text-center">
              Oblig.
            </TableHead>
            <TableHead class="w-24 text-right">
              Bonif.
            </TableHead>
            <TableHead class="w-44">
              Modelo de coste
            </TableHead>
            <TableHead class="w-32 text-right">
              En el banco
            </TableHead>
            <TableHead class="w-32 text-right">
              Fuera
            </TableHead>
            <TableHead class="w-36 text-right">
              Coste neto total
            </TableHead>
            <TableHead class="w-32">
              Vigencia
            </TableHead>
            <TableHead class="w-20 text-center">
              Activa
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
                Sí
              </Badge>
              <span
                v-else
                class="text-muted-foreground"
              >—</span>
            </TableCell>
            <TableCell class="text-right">
              −{{ formatPp(binding.rateReductionPp) }}
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ BINDING_COST_MODE_LABELS[binding.cost.mode] }}
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
              {{ netCostOf(binding.id) === null ? '—' : formatCurrency(netCostOf(binding.id)) }}
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
