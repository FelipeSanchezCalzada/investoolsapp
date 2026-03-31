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
  dcaTransfers: PortfolioRebalancingTransfer[][]
}

type SP500CalculatorInputs = {
  initialAmount: number
  monthlyDCA: number
  years: number
}

export type FrontDBv2 = {
  selectedWorkspaceName?: string
  workspaces: {
    name: string
    description: string
    portfolioRebalancingHelper?: PortfolioRebalancingHelper
    sp500Calculator?: SP500CalculatorInputs
  }[]
}
