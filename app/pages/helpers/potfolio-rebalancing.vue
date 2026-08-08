<script setup lang="ts">
import { PAGE_NAMES } from '~/pages/routeNames'
import type { Workspace } from '~/db/types'
import useFrontDB from '~/db/useFrontDB'
import CurrentPortfolioCard from '~/components/helpers/portfolio-rebalancing/CurrentPortfolioCard.vue'
import TargetPortfolioCard from '~/components/helpers/portfolio-rebalancing/TargetPortfolioCard.vue'
import CalculateCard from '~/components/helpers/portfolio-rebalancing/CalculateCard.vue'
import TransfersCard from '~/components/helpers/portfolio-rebalancing/TransfersCard.vue'

definePageMeta({
  name: PAGE_NAMES.HELPERS.PORTFOLIO_REBALANCING,
  breadcrumb: [
    { labelKey: 'layout.breadcrumb.home', to: { name: PAGE_NAMES.INDEX } },
    { labelKey: 'tools.portfolioRebalancing.navTitle' },
  ],
})

const { selectedWorkspace } = storeToRefs(useFrontDB())

function ensurePortfolioData(ws: Workspace) {
  if (!ws.portfolioRebalancingHelper) {
    ws.portfolioRebalancingHelper = {
      current: [],
      target: [],
      dcaTransfers: [],
    }
  }
}

watchImmediate(selectedWorkspace, (ws) => {
  if (ws) {
    ensurePortfolioData(ws)
  }
})
</script>

<template>
  <div class="flex flex-col gap-6 p-3 sm:p-6 max-w-7xl mx-auto">
    <ToolPageHeader :title="$t('tools.portfolioRebalancing.title')">
      {{ $t('portfolioRebalancing.intro') }}
    </ToolPageHeader>

    <CurrentPortfolioCard />
    <TargetPortfolioCard />
    <CalculateCard />
    <TransfersCard />
  </div>
</template>
