import type { MortgageBinding } from '~/db/types/FrontDBv3'
import { simulateInvestmentBinding, type InvestmentSimulationResult } from '~/lib/mortgage/investment'

/** Loan year covering a 1-based month: year n spans months n*12+1 … (n+1)*12 */
export function yearIndexOfMonth(month: number): number {
  return Math.floor((month - 1) / 12)
}

/** `toYear` is exclusive, same semantics as `FinancialFreedomExpense`. */
export function isBindingInForce(binding: MortgageBinding, yearIndex: number): boolean {
  if (yearIndex < binding.fromYear) return false
  if (binding.toYear !== null && yearIndex >= binding.toYear) return false
  return true
}

/** Month in which a single premium is paid or a contribution is made for a loan year. */
function firstMonthOfYear(yearIndex: number): number {
  return yearIndex * 12 + 1
}

export type PreparedInvestment = {
  simulation: InvestmentSimulationResult
  /** Contributions treated as cash outflows (only when wouldInvestAnyway is false) */
  contributions: { month: number, amount: number }[]
  /** Balance recovered when the binding ends, net of the exit penalty */
  redemption: { month: number, amount: number } | null
  /** Income tax refund, spread in twelfths over each year in force */
  monthlyTaxDeduction: number[]
  exitPenaltyApplied: boolean
}

export type PreparedBinding = {
  binding: MortgageBinding
  /** Net attributable cost of each loan year (excludes the `permille` mode) */
  yearlyNetCost: number[]
  yearlyGrossCost: number[]
  /** Yearly fraction over the outstanding principal, for the `permille` mode */
  netPermilleRate: number
  grossPermilleRate: number
  /** Cash outflow at t = 0 (non financed single premium starting on year 0) */
  upfrontNetCost: number
  upfrontGrossCost: number
  /** Single premium added to the loan principal at t = 0 */
  financedUpfrontAmount: number
  /** Later single premiums: renewals and premiums that start after year 0 */
  premiumEvents: { month: number, netCost: number, grossCost: number, financedAmount: number }[]
  /** Number of automatic renewals of a single premium, for the UI warning */
  singlePremiumRenewals: number
  investment: PreparedInvestment | null
}

export type PrepareBindingsOptions = {
  termMonths: number
  /** common.expectedReturnPct, inherited by `investment` bindings without an override */
  expectedReturnPct: number
}

function prepareBinding(binding: MortgageBinding, options: PrepareBindingsOptions): PreparedBinding {
  const termYears = Math.max(1, Math.ceil(options.termMonths / 12))
  const fromYear = Math.max(0, Math.floor(binding.fromYear))
  const endYear = Math.min(binding.toYear ?? termYears, termYears)

  const prepared: PreparedBinding = {
    binding,
    yearlyNetCost: new Array<number>(termYears).fill(0),
    yearlyGrossCost: new Array<number>(termYears).fill(0),
    netPermilleRate: 0,
    grossPermilleRate: 0,
    upfrontNetCost: 0,
    upfrontGrossCost: 0,
    financedUpfrontAmount: 0,
    premiumEvents: [],
    singlePremiumRenewals: 0,
    investment: null,
  }

  const cost = binding.cost

  if (cost.mode === 'annual') {
    for (let year = fromYear; year < endYear; year++) {
      const growth = (1 + cost.growthPct / 100) ** year
      const discount = year === fromYear ? 1 - cost.bankFirstYearDiscountPct / 100 : 1
      const bank = cost.bankCost * growth * discount
      const market = cost.marketCost * growth
      prepared.yearlyGrossCost[year] = bank
      prepared.yearlyNetCost[year] = bank - market
    }
  } else if (cost.mode === 'permille') {
    prepared.grossPermilleRate = cost.permille / 1000
    prepared.netPermilleRate = (cost.permille - cost.marketPermille) / 1000
  } else if (cost.mode === 'singlePremium') {
    const coverYears = cost.coverYears > 0 ? Math.floor(cost.coverYears) : Math.max(1, endYear - fromYear)
    const netCost = cost.amount - cost.marketAmount

    for (let year = fromYear; year < endYear; year += coverYears) {
      const isFirst = year === fromYear
      if (!isFirst) prepared.singlePremiumRenewals++

      if (year === 0) {
        if (cost.financed) prepared.financedUpfrontAmount += cost.amount
        else {
          prepared.upfrontNetCost += netCost
          prepared.upfrontGrossCost += cost.amount
        }
        continue
      }

      prepared.premiumEvents.push({
        month: firstMonthOfYear(year),
        netCost: cost.financed ? 0 : netCost,
        grossCost: cost.financed ? 0 : cost.amount,
        financedAmount: cost.financed ? cost.amount : 0,
      })
    }
  } else if (cost.mode === 'investment') {
    const yearsInForce = Math.max(0, endYear - fromYear)
    const simulation = simulateInvestmentBinding({
      cost,
      years: yearsInForce,
      fallbackReturnPct: options.expectedReturnPct,
    })

    for (let i = 0; i < simulation.yearlyCost.length; i++) {
      const year = fromYear + i
      if (year >= termYears) break
      prepared.yearlyNetCost[year] = simulation.yearlyCost[i]!
      prepared.yearlyGrossCost[year] = simulation.yearlyCost[i]!
    }

    const contributions: { month: number, amount: number }[] = []
    const monthlyTaxDeduction = new Array<number>(termYears).fill(0)

    for (let i = 0; i < simulation.contributions.length; i++) {
      const year = fromYear + i
      if (year >= termYears) break
      if (!cost.wouldInvestAnyway) {
        contributions.push({ month: year === 0 ? 0 : firstMonthOfYear(year), amount: simulation.contributions[i]! })
      }
      monthlyTaxDeduction[year] = (simulation.contributions[i]! * cost.taxDeductionPct / 100) / 12
    }

    const exitPenaltyApplied = yearsInForce < cost.minYears && cost.exitPenaltyPct > 0
    const redemptionMonth = Math.min(endYear * 12, options.termMonths)
    const redemptionAmount = simulation.finalBankBalance
      * (exitPenaltyApplied ? 1 - cost.exitPenaltyPct / 100 : 1)

    prepared.investment = {
      simulation,
      contributions,
      redemption: !cost.wouldInvestAnyway && redemptionAmount !== 0
        ? { month: Math.max(1, redemptionMonth), amount: redemptionAmount }
        : null,
      monthlyTaxDeduction,
      exitPenaltyApplied,
    }
  }

  return prepared
}

export function prepareBindings(
  bindings: MortgageBinding[],
  options: PrepareBindingsOptions,
): PreparedBinding[] {
  return bindings.map(binding => prepareBinding(binding, options))
}

/** Sum of the rate reductions in force on a given loan year, capped by `maxBonusPp`. */
export function totalRateReductionPp(
  bindings: MortgageBinding[],
  yearIndex: number,
  maxBonusPp: number | null,
): number {
  let total = 0
  for (const binding of bindings) {
    if (!isBindingInForce(binding, yearIndex)) continue
    total += binding.rateReductionPp
  }
  if (maxBonusPp !== null && total > maxBonusPp) return maxBonusPp
  return total
}
