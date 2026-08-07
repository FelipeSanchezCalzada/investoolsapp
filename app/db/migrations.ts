import type { FrontDBv1 } from '~/db/types/FrontDBv1'
import type { FrontDBv2 } from '~/db/types/FrontDBv2'
import type { FrontDBv3 } from '~/db/types/FrontDBv3'

export const migrationsMap = {
  'v1-v2': (v1DB: FrontDBv1): FrontDBv2 => {
    return {
      selectedWorkspaceName: v1DB.selectedWorkspaceName,
      workspaces: v1DB.workspaces.map(workspace => ({
        name: workspace.name,
        description: workspace.description,
        portfolioRebalancingHelper: workspace.portfolioRebalancingHelper
          ? {
              current: workspace.portfolioRebalancingHelper.current,
              target: workspace.portfolioRebalancingHelper.target,
              dcaTransfers: workspace.portfolioRebalancingHelper.transfers.length > 0
                ? [workspace.portfolioRebalancingHelper.transfers]
                : [],
            }
          : undefined,
      })),
    }
  },
  /**
   * Additive migration: `mortgageComparator` is created lazily by its composable,
   * so there is nothing to backfill here beyond the version bump.
   */
  'v2-v3': (v2DB: FrontDBv2): FrontDBv3 => {
    return {
      selectedWorkspaceName: v2DB.selectedWorkspaceName,
      workspaces: v2DB.workspaces.map(workspace => ({ ...workspace })),
    }
  },
}
