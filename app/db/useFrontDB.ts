import { skipHydrate } from 'pinia'
import { CURRENT_DB_VERSION, type StorageFrontDB, type Workspace } from '~/db/types'

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
    const initialSelectedWorkspace = storageFrontDB.value.data.workspaces.find(ws => ws.name === storageFrontDB.value.data.selectedWorkspaceName)
    if (initialSelectedWorkspace) {
      selectedWorkspace.value = initialSelectedWorkspace
    }
    isInitialized.value = true
  }

  const resetDB = () => {
    storageFrontDB.value = EMPTY_DB
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
    storageFrontDB: skipHydrate(storageFrontDB),
    workspaces: skipHydrate(workspaces),
    selectedWorkspace: skipHydrate(selectedWorkspace),
  }
})
export default useFrontDB
