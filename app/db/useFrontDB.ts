import { skipHydrate } from 'pinia'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { until } from '@vueuse/core'
import { CURRENT_DB_VERSION, type StorageFrontDB, type Workspace } from '~/db/types'
import { migrationsMap } from '~/db/migrations'

const DEFAULT_WORKSPACE_NAME = 'Default'

/**
 * IndexedDB persists values with the structured clone algorithm, which throws a
 * `DataCloneError` on Vue reactive proxies. Any object read through a reactive
 * proxy hands back nested proxies, so everything stored must be flattened back
 * into plain data first; otherwise every write silently fails and the whole DB
 * stops persisting.
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

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

  const { data: storageFrontDB, isFinished: isIDBLoaded } = useIDBKeyval<StorageFrontDB>('frontDB', structuredClone(EMPTY_DB), {
    shallow: false,
    serializer: {
      read: value => value,
      write: value => toPlain(value),
    },
    onError: error => console.error('[frontDB] could not persist to IndexedDB', error),
  })
  const workspaces = computed(() => storageFrontDB.value.data.workspaces)
  const selectedWorkspace = ref<Workspace>()

  const runMigrations = () => {
    if (storageFrontDB.value.version >= CURRENT_DB_VERSION) {
      return
    }
    // Migrations run over a plain snapshot: spreading objects read through the
    // reactive proxy would store nested proxies and break every later write.
    const migrated = toPlain(storageFrontDB.value)
    while (migrated.version < CURRENT_DB_VERSION) {
      const migrationKey = `v${migrated.version}-v${migrated.version + 1}` as keyof typeof migrationsMap
      const migrationFn = migrationsMap[migrationKey]
      if (!migrationFn) {
        break
      }
      migrated.data = migrationFn(migrated.data as never)
      migrated.version = migrated.version + 1
    }
    storageFrontDB.value = migrated
  }

  const initializeDB = async () => {
    isInitialized.value = false
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
    initializeDB().then()
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
