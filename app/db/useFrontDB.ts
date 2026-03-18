import { skipHydrate } from 'pinia'
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

  const storageFrontDB = useLocalStorage<StorageFrontDB>('frontDB', EMPTY_DB)
  const workspaces = computed(() => storageFrontDB.value.data.workspaces)
  const selectedWorkspace = ref<Workspace>()

  const initializeDB = () => {
    while (storageFrontDB.value.version < CURRENT_DB_VERSION) {
      const migrationKey = `v${storageFrontDB.value.version}-v${storageFrontDB.value.version + 1}` as keyof typeof migrationsMap
      const migrationFn = migrationsMap[migrationKey]
      if (!migrationFn) {
        console.error(`Migration ${migrationKey} not found`)
        break
      }
      storageFrontDB.value.data = migrationFn(storageFrontDB.value.data as never)
      storageFrontDB.value.version = storageFrontDB.value.version + 1
    }

    const initialSelectedWorkspace = storageFrontDB.value.data.workspaces.find(ws => ws.name === storageFrontDB.value.data.selectedWorkspaceName)
    if (initialSelectedWorkspace) {
      selectedWorkspace.value = initialSelectedWorkspace
    }
    isInitialized.value = true
  }

  const resetDB = () => {
    storageFrontDB.value = EMPTY_DB
  }

  const exportJson = () => {
    return JSON.stringify(storageFrontDB.value, null, 2)
  }

  const importJsonDB = (jsonDB: string) => {
    storageFrontDB.value = JSON.parse(jsonDB)
    isInitialized.value = false
    initializeDB()
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
  }, { deep: true })

  watch(() => storageFrontDB.value.data.selectedWorkspaceName, (newSelectedWorkspaceName) => {
    console.log(newSelectedWorkspaceName)
  })

  return {
    isInitialized: skipHydrate(isInitialized),
    initializeDB,
    resetDB,
    exportJson,
    importJsonDB,
    storageFrontDB: skipHydrate(storageFrontDB),
    workspaces: skipHydrate(workspaces),
    selectedWorkspace: skipHydrate(selectedWorkspace),
  }
})
export default useFrontDB
