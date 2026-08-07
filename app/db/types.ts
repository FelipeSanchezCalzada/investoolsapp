import type { FrontDBv3 } from '~/db/types/FrontDBv3'

export type FrontDB = FrontDBv3
export type Workspace = FrontDB['workspaces'][number]
export const CURRENT_DB_VERSION = 3

export type StorageFrontDB = {
  version: number
  data: FrontDB
}
