import type { MortgageBindingCostInvestment } from '~/db/types/FrontDBv3'

export type InvestmentSimulationInput = {
  cost: MortgageBindingCostInvestment
  /** Number of years the binding is in force */
  years: number
  /** common.expectedReturnPct, used when the binding does not override it */
  fallbackReturnPct: number
}

export type InvestmentSimulationResult = {
  /** Attributable cost of each year in force (index 0 = first year in force) */
  yearlyCost: number[]
  bankBalance: number[]
  alternativeBalance: number[]
  contributions: number[]
  totalCost: number
  totalContributed: number
  finalBankBalance: number
  finalAlternativeBalance: number
}

/**
 * Two portfolios in parallel with the same contributions: one with the bank fees
 * (plus the expected management gap) and one with the alternative fees.
 * The attributable cost of a year is how much the gap between both widened that year.
 */
export function simulateInvestmentBinding(input: InvestmentSimulationInput): InvestmentSimulationResult {
  const { cost, fallbackReturnPct } = input
  const years = Math.max(0, Math.floor(input.years))

  const grossReturn = (cost.expectedReturnPct ?? fallbackReturnPct) / 100
  const bankRate = grossReturn - cost.bankFeePct / 100 - cost.bankReturnGapPct / 100
  const alternativeRate = grossReturn - cost.alternativeFeePct / 100

  const yearlyCost: number[] = []
  const bankBalance: number[] = []
  const alternativeBalance: number[] = []
  const contributions: number[] = []

  let bank = 0
  let alternative = 0
  let previousGap = 0
  let totalContributed = 0

  for (let year = 0; year < years; year++) {
    const contribution = (year === 0 ? cost.initialContribution : 0) + cost.annualContribution
    totalContributed += contribution

    bank = (bank + contribution) * (1 + bankRate)
    alternative = (alternative + contribution) * (1 + alternativeRate)

    const gap = alternative - bank
    yearlyCost.push(gap - previousGap)
    previousGap = gap

    contributions.push(contribution)
    bankBalance.push(bank)
    alternativeBalance.push(alternative)
  }

  return {
    yearlyCost,
    bankBalance,
    alternativeBalance,
    contributions,
    totalCost: yearlyCost.reduce((sum, value) => sum + value, 0),
    totalContributed,
    finalBankBalance: bank,
    finalAlternativeBalance: alternative,
  }
}
