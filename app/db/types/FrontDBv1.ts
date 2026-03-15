type PortfolioRebalancingCurrentFund = {
  id: string
  name: string
  isin: string
  amount: number
}

type PortfolioRebalancingTargetFund = {
  id: string
  name: string
  isin: string
  percentage: number
}

type PortfolioRebalancingTransfer = {
  fromName: string
  fromIsin: string
  toName: string
  toIsin: string
  amount: number
  done: boolean
}

type PortfolioRebalancingHelper = {
  current: PortfolioRebalancingCurrentFund[]
  target: PortfolioRebalancingTargetFund[]
  transfers: PortfolioRebalancingTransfer[]
}

export type FrontDBv1 = {
  selectedWorkspaceName?: string
  workspaces: {
    name: string
    description: string
    portfolioRebalancingHelper?: PortfolioRebalancingHelper
  }[]
}
