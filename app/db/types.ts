import type { FrontDBv1 } from './types/FrontDBv1'

export type FrontDB = FrontDBv1
export type Workspace = FrontDB['workspaces'][number]
export const CURRENT_DB_VERSION = 1

export type StorageFrontDB = {
  version: number
  data: FrontDB
}
