import type { FrontDBv2 } from '~/db/types/FrontDBv2'

export type FrontDB = FrontDBv2
export type Workspace = FrontDB['workspaces'][number]
export const CURRENT_DB_VERSION = 2

export type StorageFrontDB = {
  version: number
  data: FrontDB
}
