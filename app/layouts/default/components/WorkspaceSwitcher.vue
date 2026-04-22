<script setup lang="ts">
import { ChevronsUpDown, Download, Pencil, Plus, RotateCcw, Trash2, Upload } from '@lucide/vue'
import { ref } from 'vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
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
import { useFrontDB } from '@/db/useFrontDB'
import type { Workspace } from '~/db/types'

enum CreateUpdateWorkspaceDialogMode {
  NOTHING,
  CREATE,
  UPDATE,
}

const { isMobile } = useSidebar()
const dbStore = useFrontDB()

const dropdownOpen = ref(false)
const wsName = ref('')
const wsDescription = ref('')
const oldWorkspaceToUpdate = ref<Workspace>()

const createUpdateWorkspaceDialogMode = ref<CreateUpdateWorkspaceDialogMode>(CreateUpdateWorkspaceDialogMode.NOTHING)

const openCreateWorkspaceDialog = () => {
  wsName.value = ''
  wsDescription.value = ''
  createUpdateWorkspaceDialogMode.value = CreateUpdateWorkspaceDialogMode.CREATE
}

const openUpdateWorkspaceDialog = (ws: Workspace) => {
  oldWorkspaceToUpdate.value = ws
  wsName.value = ws.name
  wsDescription.value = ws.description
  createUpdateWorkspaceDialogMode.value = CreateUpdateWorkspaceDialogMode.UPDATE
}

const wsNameAlreadyExists = computed(() => {
  return dbStore.workspaces.some(ws => ws.name === wsName.value)
})

const createWorkspace = () => {
  const newWorkspace: Workspace = {
    name: wsName.value,
    description: wsDescription.value,
  }
  dbStore.storageFrontDB.data.selectedWorkspaceName = wsName.value
  dbStore.workspaces.push(newWorkspace)
  dbStore.selectedWorkspace = newWorkspace
}

const updateWorkspace = () => {
  oldWorkspaceToUpdate.value!.name = wsName.value
  oldWorkspaceToUpdate.value!.description = wsDescription.value
  dbStore.storageFrontDB.data.selectedWorkspaceName = wsName.value
}

const onDialogSubmit = () => {
  if (createUpdateWorkspaceDialogMode.value === CreateUpdateWorkspaceDialogMode.CREATE) {
    createWorkspace()
  }
  if (createUpdateWorkspaceDialogMode.value === CreateUpdateWorkspaceDialogMode.UPDATE) {
    updateWorkspace()
  }
  createUpdateWorkspaceDialogMode.value = CreateUpdateWorkspaceDialogMode.NOTHING
  dropdownOpen.value = false
}

const resetDialogOpen = ref(false)

const handleResetDB = () => {
  dbStore.resetDB()
  dbStore.initializeDB()
  resetDialogOpen.value = false
  dropdownOpen.value = false
}

const handleExportDB = () => {
  const json = dbStore.exportJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `investools-db-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
  dropdownOpen.value = false
}

const handleImportDB = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const success = dbStore.importJsonDB(reader.result as string)
      if (success) {
        dbStore.initializeDB()
      }
      dropdownOpen.value = false
    }
    reader.readAsText(file)
  }
  input.click()
}

const canDeleteWorkspaces = computed(() => dbStore.workspaces.length > 1)
const deleteWorkspace = (ws: Workspace) => {
  dbStore.storageFrontDB.data.workspaces = dbStore.storageFrontDB.data.workspaces.filter(w => w.name !== ws.name)
  if (dbStore.selectedWorkspace === ws) {
    dbStore.selectedWorkspace = dbStore.workspaces[0]
  }
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu
        v-if="dbStore.selectedWorkspace"
        v-model:open="dropdownOpen"
      >
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <div class="grid flex-1 text-left text-sm leading-tight ml-2">
              <span class="truncate font-medium">
                {{ dbStore.selectedWorkspace.name }}
              </span>
              <span class="truncate text-xs">{{ dbStore.selectedWorkspace.description }}</span>
            </div>
            <ChevronsUpDown class="ml-auto" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          align="start"
          :side="isMobile ? 'bottom' : 'right'"
          :sideOffset="4"
        >
          <DropdownMenuLabel class="text-xs text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          <DropdownMenuItem
            v-for="workspace in dbStore.workspaces"
            :key="workspace.name"
            class="group gap-2 p-2"
            @click="dbStore.selectedWorkspace = workspace"
          >
            <span class="flex-1 truncate">{{ workspace.name }}</span>
            <span class="ml-auto flex gap-1 opacity-0 group-hover:opacity-100">
              <button
                class="rounded p-0.5 hover:bg-sidebar-accent"
                @click.stop="openUpdateWorkspaceDialog(workspace)"
              >
                <Pencil class="size-3.5" />
              </button>
              <button
                v-if="canDeleteWorkspaces"
                class="rounded p-0.5 hover:bg-destructive/20 hover:text-destructive"
                @click.stop="deleteWorkspace(workspace)"
              >
                <Trash2 class="size-3.5" />
              </button>
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            class="gap-2 p-2"
            @click="openCreateWorkspaceDialog"
          >
            <div class="flex size-6 items-center justify-center rounded-md border bg-transparent">
              <Plus class="size-4" />
            </div>
            <div class="font-medium text-muted-foreground">
              Nuevo workspace
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div class="flex gap-1 px-2 py-1">
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              title="Exportar base de datos como JSON"
              @click.stop="handleExportDB"
            >
              <Download class="size-4" />
              Exportar
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              title="Importar base de datos desde JSON"
              @click.stop="handleImportDB"
            >
              <Upload class="size-4" />
              Importar
            </Button>
          </div>
          <DropdownMenuItem
            class="gap-2 p-2 text-destructive focus:text-destructive"
            @click="resetDialogOpen = true"
          >
            <div class="flex size-6 items-center justify-center rounded-md border border-destructive/50 bg-transparent">
              <RotateCcw class="size-4" />
            </div>
            <div class="font-medium">
              Resetear base de datos
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>

  <!-- Dialog crear / editar workspace -->
  <Dialog
    :open="createUpdateWorkspaceDialogMode !== CreateUpdateWorkspaceDialogMode.NOTHING"
    @update:open="(open: boolean) => { if (!open) createUpdateWorkspaceDialogMode = CreateUpdateWorkspaceDialogMode.NOTHING }"
  >
    <DialogContent class="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {{ createUpdateWorkspaceDialogMode === CreateUpdateWorkspaceDialogMode.CREATE ? 'Crear workspace' : 'Editar workspace' }}
        </DialogTitle>
        <DialogDescription>
          {{ createUpdateWorkspaceDialogMode === CreateUpdateWorkspaceDialogMode.CREATE
            ? 'Crea un nuevo workspace para organizar tus herramientas.'
            : 'Modifica el nombre o la descripción del workspace.' }}
        </DialogDescription>
      </DialogHeader>

      <form
        class="grid gap-4 py-2"
        @submit.prevent="onDialogSubmit"
      >
        <div class="grid gap-2">
          <Label for="ws-name">Nombre</Label>
          <Input
            id="ws-name"
            v-model="wsName"
            placeholder="Mi workspace"
          />
          <p
            v-if="wsNameAlreadyExists && createUpdateWorkspaceDialogMode === CreateUpdateWorkspaceDialogMode.CREATE"
            class="text-xs text-destructive"
          >
            Ya existe un workspace con ese nombre.
          </p>
        </div>
        <div class="grid gap-2">
          <Label for="ws-description">Descripción</Label>
          <Input
            id="ws-description"
            v-model="wsDescription"
            placeholder="Descripción opcional"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            @click="createUpdateWorkspaceDialogMode = CreateUpdateWorkspaceDialogMode.NOTHING"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            :disabled="!wsName.trim() || (wsNameAlreadyExists && createUpdateWorkspaceDialogMode === CreateUpdateWorkspaceDialogMode.CREATE)"
          >
            {{ createUpdateWorkspaceDialogMode === CreateUpdateWorkspaceDialogMode.CREATE ? 'Crear' : 'Guardar' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Alert dialog resetear base de datos -->
  <AlertDialog v-model:open="resetDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Resetear base de datos</AlertDialogTitle>
        <AlertDialogDescription>
          Esta acción eliminará todos los datos almacenados, incluyendo todos los workspaces y su contenido. Esta acción no se puede deshacer.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="handleResetDB"
        >
          Resetear
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
