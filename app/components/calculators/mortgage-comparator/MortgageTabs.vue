<script setup lang="ts">
import { Copy, EllipsisVertical, Eye, EyeOff, Pencil, Plus, Scale, Trash2 } from '@lucide/vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { COMPARISON_TAB_ID, formatPercent } from '~/composables/useMortgageComparator'

const {
  mortgages,
  comparison,
  addMortgage,
  removeMortgage,
  duplicateMortgage,
  findMortgage,
} = useMortgageComparator()

const renameTargetId = ref<string | null>(null)
const renameValue = ref('')
// `AlertDialogAction` closes the dialog before our own click handler runs, so the
// open state is tracked apart from the target: clearing the target on close would
// wipe it before `confirmDelete` can read it.
const deleteTargetId = ref<string | null>(null)
const isDeleteDialogOpen = ref(false)

const deleteTargetName = computed(() =>
  mortgages.value.find(mortgage => mortgage.id === deleteTargetId.value)?.name ?? '',
)

function rateSummary(mortgageId: string): string {
  const mortgage = findMortgage(mortgageId)
  if (!mortgage) return ''
  if (mortgage.rateType === 'fixed') return `${formatPercent(mortgage.fixedRatePct, ' %')} fijo`
  if (mortgage.rateType === 'mixed') return `mixta ${formatPercent(mortgage.fixedRatePct, ' %')}`
  return `Eur+${formatPercent(mortgage.spreadPct, ' %')}`
}

function openRename(mortgageId: string) {
  renameTargetId.value = mortgageId
  renameValue.value = findMortgage(mortgageId)?.name ?? ''
}

function confirmRename() {
  const mortgage = renameTargetId.value ? findMortgage(renameTargetId.value) : null
  if (mortgage && renameValue.value.trim()) mortgage.name = renameValue.value.trim()
  renameTargetId.value = null
}

function toggleEnabled(mortgageId: string) {
  const mortgage = findMortgage(mortgageId)
  if (mortgage) mortgage.enabled = !mortgage.enabled
}

function openDelete(mortgageId: string) {
  deleteTargetId.value = mortgageId
  isDeleteDialogOpen.value = true
}

function confirmDelete() {
  if (deleteTargetId.value) removeMortgage(deleteTargetId.value)
  deleteTargetId.value = null
  isDeleteDialogOpen.value = false
}
</script>

<template>
  <TabsList class="h-auto w-full justify-start gap-1 overflow-x-auto p-1">
    <div
      v-for="mortgage in mortgages"
      :key="mortgage.id"
      class="flex shrink-0 items-center"
      :class="{ 'opacity-50': !mortgage.enabled }"
    >
      <TabsTrigger
        :value="mortgage.id"
        class="gap-2"
      >
        <span
          class="size-2.5 shrink-0 rounded-full"
          :style="{ backgroundColor: mortgage.color }"
        />
        <span class="whitespace-nowrap">
          {{ mortgage.name || 'Sin nombre' }}
          <span class="hidden text-muted-foreground sm:inline">· {{ rateSummary(mortgage.id) }}</span>
        </span>
        <Badge
          v-if="comparison?.rankByApr[mortgage.id]"
          variant="outline"
          class="px-1.5 py-0 text-[10px]"
          :class="comparison.rankByApr[mortgage.id] === 1
            ? 'border-green-500/40 text-green-600 dark:text-green-400'
            : 'text-muted-foreground'"
        >
          #{{ comparison.rankByApr[mortgage.id] }}
        </Badge>
      </TabsTrigger>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            class="size-7"
          >
            <EllipsisVertical class="size-4" />
            <span class="sr-only">Opciones de {{ mortgage.name }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem @select="openRename(mortgage.id)">
            <Pencil class="mr-2 size-4" />
            Renombrar
          </DropdownMenuItem>
          <DropdownMenuItem @select="duplicateMortgage(mortgage.id)">
            <Copy class="mr-2 size-4" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem @select="toggleEnabled(mortgage.id)">
            <component
              :is="mortgage.enabled ? EyeOff : Eye"
              class="mr-2 size-4"
            />
            {{ mortgage.enabled ? 'Excluir de la comparativa' : 'Incluir en la comparativa' }}
          </DropdownMenuItem>
          <DropdownMenuItem
            class="text-destructive"
            @select="openDelete(mortgage.id)"
          >
            <Trash2 class="mr-2 size-4" />
            Borrar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <Button
      size="sm"
      variant="ghost"
      class="shrink-0"
      @click="addMortgage()"
    >
      <Plus class="mr-1 size-4" />
      Añadir
    </Button>

    <Separator
      orientation="vertical"
      class="mx-1 !h-6 shrink-0"
    />

    <TabsTrigger
      :value="COMPARISON_TAB_ID"
      class="shrink-0 gap-2 border border-primary bg-primary/10 font-semibold data-[state=active]:bg-primary/20"
    >
      <Scale class="size-4" />
      Comparativa
    </TabsTrigger>
  </TabsList>

  <Dialog
    :open="renameTargetId !== null"
    @update:open="(value) => { if (!value) renameTargetId = null }"
  >
    <DialogContent class="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>Renombrar hipoteca</DialogTitle>
      </DialogHeader>
      <Input
        v-model="renameValue"
        placeholder="Ej: BBVA fija 2,45 %"
        @keydown.enter="confirmRename"
      />
      <DialogFooter>
        <Button
          variant="outline"
          @click="renameTargetId = null"
        >
          Cancelar
        </Button>
        <Button @click="confirmRename">
          Guardar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="isDeleteDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>¿Borrar «{{ deleteTargetName }}»?</AlertDialogTitle>
        <AlertDialogDescription>
          Se eliminan sus condiciones, vinculaciones y amortizaciones anticipadas. No se puede deshacer.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="confirmDelete"
        >
          Borrar
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
