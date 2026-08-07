import type {
  Mortgage,
  MortgageBinding,
  MortgageFeeTier,
  MortgageIndexScenario,
  MortgagePrepayment,
} from '~/db/types/FrontDBv3'
import { isBindingInForce, prepareBindings, totalRateReductionPp, yearIndexOfMonth, type PreparedBinding } from '~/lib/mortgage/bindings'

/** French system installment for a given outstanding principal and remaining months. */
export function frenchInstallment(principal: number, annualRatePct: number, months: number): number {
  if (months <= 0 || principal <= 0) return Math.max(0, principal)
  const monthlyRate = annualRatePct / 100 / 12
  // Non positive rate after bonuses: straight capital split, no division by zero
  if (monthlyRate <= 0) return principal / months
  return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months)
}

/** Linear interpolation between the scenario points; constant after the last one. */
export function indexPctAtMonth(scenario: MortgageIndexScenario, month: number): number {
  const points = [...scenario.points].sort((a, b) => a.year - b.year)
  if (points.length === 0) return 0
  const year = Math.max(0, (month - 1) / 12)

  const first = points[0]!
  if (year <= first.year) return first.valuePct

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]!
    const current = points[i]!
    if (year <= current.year) {
      const span = current.year - previous.year
      if (span <= 0) return current.valuePct
      const ratio = (year - previous.year) / span
      return previous.valuePct + (current.valuePct - previous.valuePct) * ratio
    }
  }

  return points[points.length - 1]!.valuePct
}

export function feeTierPct(tiers: MortgageFeeTier[], yearIndex: number): number {
  for (const tier of tiers) {
    if (yearIndex < tier.fromYear) continue
    if (tier.toYear !== null && yearIndex >= tier.toYear) continue
    return tier.pct
  }
  return 0
}

function prepaymentAppliesInMonth(prepayment: MortgagePrepayment, month: number): boolean {
  if (prepayment.amount <= 0 || prepayment.month <= 0) return false
  if (month === prepayment.month) return true
  if (prepayment.recurringEveryMonths === null || prepayment.recurringEveryMonths <= 0) return false
  if (month < prepayment.month) return false
  return (month - prepayment.month) % prepayment.recurringEveryMonths === 0
}

/** Base rate of the month, before bonuses. */
export function baseRatePct(
  mortgage: Mortgage,
  month: number,
  indexAt: (month: number) => number,
): number {
  if (mortgage.rateType === 'fixed') return mortgage.fixedRatePct

  const isMixed = mortgage.rateType === 'mixed'
  const fixedMonths = isMixed ? mortgage.mixedFixedMonths : mortgage.initialRateMonths

  if (month <= fixedMonths) {
    return isMixed ? mortgage.fixedRatePct : mortgage.initialRatePct
  }

  const reviewEvery = mortgage.reviewEveryMonths > 0 ? mortgage.reviewEveryMonths : 12
  const monthsIntoVariable = month - fixedMonths - 1
  const periodStartMonth = fixedMonths + 1 + Math.floor(monthsIntoVariable / reviewEvery) * reviewEvery
  return indexAt(periodStartMonth) + mortgage.spreadPct
}

function clampRate(rate: number, floorPct: number | null, capPct: number | null): number {
  let result = rate
  if (floorPct !== null && result < floorPct) result = floorPct
  if (capPct !== null && result > capPct) result = capPct
  return result
}

export type MortgageScheduleRow = {
  month: number
  yearIndex: number
  baseRatePct: number
  appliedRatePct: number
  installment: number
  interest: number
  principalPaid: number
  prepayment: number
  prepaymentFee: number
  bindingNetCost: number
  bindingGrossCost: number
  outstanding: number
}

export type MortgageSimulationOptions = {
  mortgage: Mortgage
  /** Resolved principal (already inherited/overridden) */
  principal: number
  /** Resolved term in months */
  termMonths: number
  /** Bindings taken into account by this simulation */
  bindings: MortgageBinding[]
  indexAt: (month: number) => number
  /** common.expectedReturnPct, inherited by `investment` bindings */
  expectedReturnPct: number
  /** Upfront costs paid by the client, in euros (without the opening fee) */
  upfrontClientCost: number
  openingFee: number
  /** Official APR criterion: bindings at gross cost, no tax refunds */
  useGrossBindingCost?: boolean
  includePrepayments?: boolean
  includeInvestmentCashFlows?: boolean
}

export type MortgageSimulation = {
  schedule: MortgageScheduleRow[]
  /** Cash flows of the client, index = month since signature */
  cashFlows: number[]
  preparedBindings: PreparedBinding[]
  /** Principal actually lent, including financed single premiums */
  loanPrincipal: number
  financedPremiums: number
  totalInterest: number
  totalPrepaid: number
  totalPrepaymentFees: number
  totalBindingNetCost: number
  totalBindingGrossCost: number
  totalInstallments: number
  upfrontClientCost: number
  openingFee: number
  months: number
  cancelledEarly: boolean
}

/**
 * Month by month simulation of the loan.
 *
 * Order inside the monthly loop (matters because prepayments change the outstanding
 * principal and with it the `permille` premium):
 *   1. applied rate of the month, 2. installment recalculation, 3. interest and capital,
 *   4. single premium renewals, 5. prepayment and its fee, 6. binding costs.
 */
export function simulateMortgage(options: MortgageSimulationOptions): MortgageSimulation {
  const {
    mortgage,
    principal,
    termMonths,
    bindings,
    indexAt,
    expectedReturnPct,
    upfrontClientCost,
    openingFee,
    useGrossBindingCost = false,
    includePrepayments = true,
    includeInvestmentCashFlows = true,
  } = options

  const preparedBindings = prepareBindings(bindings, { termMonths, expectedReturnPct })

  const financedPremiums = preparedBindings.reduce((sum, prepared) => sum + prepared.financedUpfrontAmount, 0)
  const loanPrincipal = principal + financedPremiums

  const upfrontBindingCost = preparedBindings.reduce(
    (sum, prepared) => sum + (useGrossBindingCost ? prepared.upfrontGrossCost : prepared.upfrontNetCost),
    0,
  )

  let initialInvestmentContribution = 0
  if (includeInvestmentCashFlows) {
    for (const prepared of preparedBindings) {
      for (const contribution of prepared.investment?.contributions ?? []) {
        if (contribution.month === 0) initialInvestmentContribution += contribution.amount
      }
    }
  }

  const cashFlows: number[] = [
    loanPrincipal - upfrontClientCost - openingFee - upfrontBindingCost - initialInvestmentContribution,
  ]

  const schedule: MortgageScheduleRow[] = []

  let outstanding = loanPrincipal
  let installment = 0
  let needsRecalculation = true
  let previousAppliedRate: number | null = null

  let totalInterest = 0
  let totalPrepaid = 0
  let totalPrepaymentFees = 0
  let totalBindingNetCost = upfrontBindingCost
  let totalBindingGrossCost = preparedBindings.reduce((sum, prepared) => sum + prepared.upfrontGrossCost, 0)
  let totalInstallments = 0
  let cancelledEarly = false
  let months = 0

  for (let month = 1; month <= termMonths; month++) {
    if (outstanding <= 1e-6) break

    const yearIndex = yearIndexOfMonth(month)
    const remainingMonths = termMonths - month + 1

    // 1. Applied rate of the month
    const base = baseRatePct(mortgage, month, indexAt)
    const bonus = totalRateReductionPp(bindings, yearIndex, mortgage.maxBonusPp)
    const applied = clampRate(base - bonus, mortgage.floorPct, mortgage.capPct)

    if (previousAppliedRate === null || Math.abs(applied - previousAppliedRate) > 1e-12) {
      needsRecalculation = true
    }
    previousAppliedRate = applied

    // 2. Installment recalculation
    if (needsRecalculation) {
      installment = frenchInstallment(outstanding, applied, remainingMonths)
      needsRecalculation = false
    }

    // 3. Interest and capital of the monthly installment
    const interest = outstanding * (applied / 100 / 12)
    let principalPaid = installment - interest
    let paidInstallment = installment

    if (principalPaid >= outstanding) {
      principalPaid = outstanding
      paidInstallment = principalPaid + interest
    }
    if (principalPaid < 0) {
      // Negative amortization is not modelled: the installment at least covers the interest
      principalPaid = 0
      paidInstallment = interest
    }

    outstanding -= principalPaid
    totalInterest += interest
    totalInstallments += paidInstallment

    // 4. Single premium renewals
    let premiumCashOut = 0
    let premiumGrossCost = 0
    for (const prepared of preparedBindings) {
      for (const event of prepared.premiumEvents) {
        if (event.month !== month) continue
        if (event.financedAmount > 0) {
          outstanding += event.financedAmount
          needsRecalculation = true
        }
        premiumCashOut += useGrossBindingCost ? event.grossCost : event.netCost
        premiumGrossCost += event.grossCost
      }
    }
    totalBindingNetCost += useGrossBindingCost ? 0 : premiumCashOut
    totalBindingGrossCost += premiumGrossCost

    // 5. Prepayments and their fees
    let prepaymentAmount = 0
    let prepaymentFee = 0
    if (includePrepayments) {
      for (const prepayment of mortgage.prepayments) {
        if (!prepaymentAppliesInMonth(prepayment, month)) continue
        if (outstanding <= 1e-6) break

        const amount = Math.min(prepayment.amount, outstanding)
        const isTotalCancellation = amount >= outstanding - 1e-6
        const tiers = isTotalCancellation
          ? mortgage.earlyRepaymentFees.total
          : mortgage.earlyRepaymentFees.partial

        prepaymentAmount += amount
        prepaymentFee += amount * (feeTierPct(tiers, yearIndex) / 100)
        outstanding -= amount

        if (isTotalCancellation) cancelledEarly = true
        if (prepayment.mode === 'reduceInstallment') needsRecalculation = true
      }
    }
    totalPrepaid += prepaymentAmount
    totalPrepaymentFees += prepaymentFee

    // 6. Binding costs, with the outstanding principal already updated
    let bindingNetCost = 0
    let bindingGrossCost = 0
    let investmentInflow = 0
    let investmentOutflow = 0

    for (const prepared of preparedBindings) {
      if (!isBindingInForce(prepared.binding, yearIndex)) continue

      bindingNetCost += (prepared.yearlyNetCost[yearIndex] ?? 0) / 12
      bindingGrossCost += (prepared.yearlyGrossCost[yearIndex] ?? 0) / 12
      bindingNetCost += outstanding * prepared.netPermilleRate / 12
      bindingGrossCost += outstanding * prepared.grossPermilleRate / 12

      const investment = prepared.investment
      if (!investment) continue
      if (!useGrossBindingCost) {
        investmentInflow += investment.monthlyTaxDeduction[yearIndex] ?? 0
      }
      if (includeInvestmentCashFlows) {
        for (const contribution of investment.contributions) {
          if (contribution.month === month) investmentOutflow += contribution.amount
        }
        if (investment.redemption?.month === month) investmentInflow += investment.redemption.amount
      }
    }

    totalBindingNetCost += bindingNetCost
    totalBindingGrossCost += bindingGrossCost

    const chosenBindingCost = useGrossBindingCost ? bindingGrossCost : bindingNetCost

    cashFlows.push(
      -paidInstallment
      - chosenBindingCost
      - premiumCashOut
      - prepaymentAmount
      - prepaymentFee
      - investmentOutflow
      + investmentInflow,
    )

    schedule.push({
      month,
      yearIndex,
      baseRatePct: base,
      appliedRatePct: applied,
      installment: paidInstallment,
      interest,
      principalPaid,
      prepayment: prepaymentAmount,
      prepaymentFee,
      bindingNetCost,
      bindingGrossCost,
      outstanding,
    })

    months = month
    if (outstanding <= 1e-6) break
  }

  // Investment balances still locked up when the loan ends
  if (includeInvestmentCashFlows && months > 0) {
    let pendingRedemption = 0
    for (const prepared of preparedBindings) {
      const redemption = prepared.investment?.redemption
      if (redemption && redemption.month > months) pendingRedemption += redemption.amount
    }
    if (pendingRedemption > 0) {
      cashFlows[months] = (cashFlows[months] ?? 0) + pendingRedemption
    }
  }

  return {
    schedule,
    cashFlows,
    preparedBindings,
    loanPrincipal,
    financedPremiums,
    totalInterest,
    totalPrepaid,
    totalPrepaymentFees,
    totalBindingNetCost,
    totalBindingGrossCost,
    totalInstallments,
    upfrontClientCost,
    openingFee,
    months,
    cancelledEarly,
  }
}
