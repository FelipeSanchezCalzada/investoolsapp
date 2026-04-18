import { skipHydrate } from 'pinia'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { until } from '@vueuse/core'
import { CURRENT_DB_VERSION, type StorageFrontDB, type Workspace } from '~/db/types'
import { migrationsMap } from '~/db/migrations'

const DEFAULT_WORKSPACE_NAME = 'Default'

const EMPTY_DB: StorageFrontDB = {
  version: CURRENT_DB_VERSION,
  data: {
    selectedWorkspaceName: DEFAULT_WORKSPACE_NAME,
    workspaces: [{
      name: DEFAULT_WORKSPACE_NAME,
      description: 'Default workspace',
    }],
  },
}

export const useFrontDB = defineStore('frontDB', () => {
  const isInitialized = ref(false)

  const { data: storageFrontDB, isFinished: isIDBLoaded } = useIDBKeyval<StorageFrontDB>('frontDB', structuredClone(EMPTY_DB), { shallow: false })
  const workspaces = computed(() => storageFrontDB.value.data.workspaces)
  const selectedWorkspace = ref<Workspace>()

  const runMigrations = () => {
    while (storageFrontDB.value.version < CURRENT_DB_VERSION) {
      const migrationKey = `v${storageFrontDB.value.version}-v${storageFrontDB.value.version + 1}` as keyof typeof migrationsMap
      const migrationFn = migrationsMap[migrationKey]
      if (!migrationFn) {
        break
      }
      storageFrontDB.value.data = migrationFn(storageFrontDB.value.data as never)
      storageFrontDB.value.version = storageFrontDB.value.version + 1
    }
  }

  const initializeDB = async () => {
    await until(isIDBLoaded).toBe(true)
    runMigrations()
    const initialSelectedWorkspace = storageFrontDB.value.data.workspaces.find(ws => ws.name === storageFrontDB.value.data.selectedWorkspaceName)
    if (initialSelectedWorkspace) {
      selectedWorkspace.value = initialSelectedWorkspace
    }
    isInitialized.value = true
  }

  initializeDB().then()

  const resetDB = () => {
    storageFrontDB.value = structuredClone(EMPTY_DB)
    initializeDB().then()
  }

  const exportJson = () => {
    return JSON.stringify(storageFrontDB.value, null, 2)
  }

  const importJsonDB = (jsonDB: string) => {
    storageFrontDB.value = JSON.parse(jsonDB)
    isInitialized.value = false
    runMigrations()
    const initialSelectedWorkspace = storageFrontDB.value.data.workspaces.find(ws => ws.name === storageFrontDB.value.data.selectedWorkspaceName)
    if (initialSelectedWorkspace) {
      selectedWorkspace.value = initialSelectedWorkspace
    }
    isInitialized.value = true
    return true
  }

  watch(selectedWorkspace, (value) => {
    if (!value) {
      return
    }
    const wsIndex = storageFrontDB.value.data.workspaces.findIndex(ws => ws.name === value.name)
    if (wsIndex === -1) {
      return
    }
    storageFrontDB.value.data.workspaces[wsIndex] = value
    storageFrontDB.value.data.selectedWorkspaceName = value.name
    triggerRef(storageFrontDB)
  }, { deep: true })

  return {
    isInitialized: skipHydrate(isInitialized),
    resetDB,
    exportJson,
    importJsonDB,
    storageFrontDB: skipHydrate(storageFrontDB),
    workspaces: skipHydrate(workspaces),
    selectedWorkspace: skipHydrate(selectedWorkspace),
  }
})
export default useFrontDB
