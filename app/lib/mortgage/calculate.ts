import type {
  Mortgage,
  MortgageBinding,
  MortgageComparator,
  MortgageComparatorCommon,
  MortgageIndexScenario,
  MortgageUpfrontCostKey,
} from '~/db/types/FrontDBv3'
import {
  indexPctAtMonth,
  simulateMortgage,
  type MortgageSimulation,
} from '~/lib/mortgage/amortization'
import { annualPercentageRatePct } from '~/lib/mortgage/irr'
import { calculateOpportunityCost, type OpportunityCostResult } from '~/lib/mortgage/opportunityCost'

export const UPFRONT_COST_KEYS: MortgageUpfrontCostKey[] = [
  'appraisal', 'notary', 'registry', 'agency', 'ajd', 'brokerFee', 'other',
]

export const UPFRONT_COST_LABELS: Record<MortgageUpfrontCostKey, string> = {
  appraisal: 'Tasación',
  notary: 'Notaría',
  registry: 'Registro',
  agency: 'Gestoría',
  ajd: 'AJD',
  brokerFee: 'Bróker / intermediario',
  other: 'Otros',
}

export function resolvePrincipal(mortgage: Mortgage, common: MortgageComparatorCommon): number {
  return mortgage.principal ?? common.principal
}

export function resolveTermMonths(mortgage: Mortgage, common: MortgageComparatorCommon): number {
  return mortgage.termMonths ?? common.termMonths
}

export function openingFeeAmount(mortgage: Mortgage, principal: number): number {
  return principal * (mortgage.upfrontCosts.openingFeePct / 100)
}

/** Upfront concepts charged to the client, opening fee excluded. */
export function clientUpfrontCostAmount(mortgage: Mortgage): number {
  return UPFRONT_COST_KEYS.reduce((sum, key) => {
    if (mortgage.upfrontCosts.paidBy[key] !== 'client') return sum
    return sum + (mortgage.upfrontCosts.amounts[key] || 0)
  }, 0)
}

export type MortgageAprSet = {
  officialApr: number | null
  realApr: number | null
  aprWithoutBindings: number | null
}

export type BindingWorthiness = {
  bindingId: string
  name: string
  required: boolean
  active: boolean
  rateReductionPp: number
  /** Interest saved thanks to the rate reduction */
  interestSavings: number
  /** Accumulated attributable net cost */
  netCost: number
  balance: number
  worthIt: boolean
  /** Net cost above which the binding stops paying off */
  breakEvenCost: number
}

export type PrepaymentEffect = {
  prepaymentId: string
  /** Interest saved by this prepayment alone, keeping the rest */
  interestSavings: number
  /** Fees paid for it */
  fees: number
  netSaving: number
  /** Months the loan is shortened by this prepayment */
  monthsSaved: number
}

export type MortgageYearlySeries = {
  years: number[]
  installment: number[]
  cumulativeCost: number[]
  outstanding: number[]
  netWorth: number[]
}

export type MortgageResult = {
  mortgage: Mortgage
  principal: number
  termMonths: number
  years: number
  simulation: MortgageSimulation
  initialInstallment: number
  averageInstallment: number
  maxInstallment: number
  finalInstallment: number
  totalInterest: number
  clientUpfrontCost: number
  openingFee: number
  totalUpfrontCost: number
  totalBindingGrossCost: number
  totalBindingNetCost: number
  totalPrepaymentFees: number
  totalCost: number
  totalOutlay: number
  averageNominalRatePct: number
  effectiveRatePct: number
  ltv: number
  apr: MortgageAprSet
  aprByScenarioId: Record<string, number | null>
  opportunityCost: OpportunityCostResult
  netWorth: number
  bindingsWorthiness: BindingWorthiness[]
  prepaymentEffects: PrepaymentEffect[]
  /** Interest saved by all the prepayments together */
  prepaymentInterestSavings: number
  yearly: MortgageYearlySeries
  warnings: string[]
  viable: boolean
  computable: boolean
}

function activeBindings(mortgage: Mortgage): MortgageBinding[] {
  return mortgage.bindings.filter(binding => binding.active)
}

function requiredBindings(mortgage: Mortgage): MortgageBinding[] {
  return mortgage.bindings.filter(binding => binding.required)
}

function weightedRates(simulation: MortgageSimulation): { base: number, applied: number } {
  let weight = 0
  let base = 0
  let applied = 0
  for (const row of simulation.schedule) {
    const rowWeight = row.outstanding + row.principalPaid
    weight += rowWeight
    base += row.baseRatePct * rowWeight
    applied += row.appliedRatePct * rowWeight
  }
  if (weight === 0) return { base: 0, applied: 0 }
  return { base: base / weight, applied: applied / weight }
}

function scenarioIndexFn(scenario: MortgageIndexScenario | undefined, fallbackPct: number) {
  if (!scenario) return () => fallbackPct
  return (month: number) => indexPctAtMonth(scenario, month)
}

function buildYearlySeries(
  simulation: MortgageSimulation,
  years: number,
  upfrontTotal: number,
  opportunity: OpportunityCostResult,
  common: MortgageComparatorCommon,
): MortgageYearlySeries {
  const yearsAxis: number[] = []
  const installment: number[] = []
  const cumulativeCost: number[] = []
  const outstanding: number[] = []
  const netWorth: number[] = []

  let runningCost = upfrontTotal
  let monthCursor = 0

  yearsAxis.push(0)
  installment.push(simulation.schedule[0]?.installment ?? 0)
  cumulativeCost.push(runningCost)
  outstanding.push(simulation.loanPrincipal)
  netWorth.push(opportunity.freeCapital - runningCost)

  for (let year = 1; year <= years; year++) {
    const lastMonthOfYear = Math.min(year * 12, simulation.schedule.length)
    for (let month = monthCursor; month < lastMonthOfYear; month++) {
      const row = simulation.schedule[month]!
      runningCost += row.interest + row.bindingNetCost + row.prepaymentFee
    }
    monthCursor = Math.max(monthCursor, lastMonthOfYear)

    const row = simulation.schedule[lastMonthOfYear - 1]
    yearsAxis.push(year)
    installment.push(row?.installment ?? 0)
    cumulativeCost.push(runningCost)
    outstanding.push(row?.outstanding ?? 0)

    const growth = common.opportunityCostEnabled ? (1 + common.expectedReturnPct / 100) ** year : 1
    const portfolio = opportunity.freeCapital > 0 ? opportunity.freeCapital * growth : opportunity.freeCapital
    const gains = Math.max(0, portfolio - opportunity.freeCapital)
    const netPortfolio = portfolio - gains * (common.capitalGainsTaxPct / 100)
    netWorth.push(netPortfolio - runningCost)
  }

  return { years: yearsAxis, installment, cumulativeCost, outstanding, netWorth }
}

function legalFeeWarnings(mortgage: Mortgage): string[] {
  const warnings: string[] = []
  const cap = mortgage.rateType === 'variable' ? 0.25 : 2
  const tiers = [...mortgage.earlyRepaymentFees.partial, ...mortgage.earlyRepaymentFees.total]
  if (tiers.some(tier => tier.pct > cap + 1e-9)) {
    warnings.push(
      `Alguna comisión de amortización supera el tope de la LCCI (${cap.toLocaleString('es-ES')} %) para este tipo de préstamo. Se calcula igual, por si la oferta es anterior a la ley.`,
    )
  }
  return warnings
}

export function calculateMortgageResult(
  mortgage: Mortgage,
  common: MortgageComparatorCommon,
  scenarios: MortgageIndexScenario[],
  selectedScenarioId: string,
): MortgageResult {
  const principal = resolvePrincipal(mortgage, common)
  const termMonths = resolveTermMonths(mortgage, common)
  const years = Math.max(1, Math.ceil(termMonths / 12))

  const clientUpfrontCost = clientUpfrontCostAmount(mortgage)
  const openingFee = openingFeeAmount(mortgage, principal)
  const totalUpfrontCost = clientUpfrontCost + openingFee

  const selectedScenario = scenarios.find(scenario => scenario.id === selectedScenarioId)
  const indexAt = scenarioIndexFn(selectedScenario, common.currentIndexPct)
  const constantIndexAt = () => common.currentIndexPct

  const warnings: string[] = [...legalFeeWarnings(mortgage)]
  const computable = principal > 0 && termMonths > 0

  const baseOptions = {
    mortgage,
    principal,
    termMonths,
    expectedReturnPct: common.expectedReturnPct,
    upfrontClientCost: clientUpfrontCost,
    openingFee,
    indexAt,
  }

  /** Placeholder for incomplete data: every figure reads zero instead of a bogus one-month loan. */
  const emptySimulation = (): MortgageSimulation => simulateMortgage({
    ...baseOptions,
    principal: 0,
    termMonths: Math.max(1, termMonths),
    bindings: [],
  })

  const simulation = computable
    ? simulateMortgage({ ...baseOptions, bindings: activeBindings(mortgage) })
    : emptySimulation()

  const officialSimulation = computable
    ? simulateMortgage({
        ...baseOptions,
        indexAt: constantIndexAt,
        bindings: requiredBindings(mortgage),
        useGrossBindingCost: true,
        includePrepayments: false,
        includeInvestmentCashFlows: false,
      })
    : null

  const withoutOptionalSimulation = computable
    ? simulateMortgage({ ...baseOptions, bindings: requiredBindings(mortgage) })
    : null

  const apr: MortgageAprSet = {
    officialApr: officialSimulation ? annualPercentageRatePct(officialSimulation.cashFlows) : null,
    realApr: computable ? annualPercentageRatePct(simulation.cashFlows) : null,
    aprWithoutBindings: withoutOptionalSimulation
      ? annualPercentageRatePct(withoutOptionalSimulation.cashFlows)
      : null,
  }

  const aprByScenarioId: Record<string, number | null> = {}
  if (computable) {
    for (const scenario of scenarios) {
      const scenarioSimulation = simulateMortgage({
        ...baseOptions,
        indexAt: scenarioIndexFn(scenario, common.currentIndexPct),
        bindings: activeBindings(mortgage),
      })
      aprByScenarioId[scenario.id] = annualPercentageRatePct(scenarioSimulation.cashFlows)
    }
  }

  // "Is this binding worth it?": rerun the simulation without each active binding
  const bindingsWorthiness: BindingWorthiness[] = []
  if (computable) {
    const active = activeBindings(mortgage)
    for (const binding of mortgage.bindings) {
      const withBinding = binding.active
        ? simulation
        : simulateMortgage({ ...baseOptions, bindings: [...active, binding] })
      const withoutBinding = simulateMortgage({
        ...baseOptions,
        bindings: (binding.active ? active : [...active, binding]).filter(item => item.id !== binding.id),
      })

      const interestSavings = withoutBinding.totalInterest - withBinding.totalInterest
      const netCost = withBinding.totalBindingNetCost - withoutBinding.totalBindingNetCost
      const balance = interestSavings - netCost

      bindingsWorthiness.push({
        bindingId: binding.id,
        name: binding.name,
        required: binding.required,
        active: binding.active,
        rateReductionPp: binding.rateReductionPp,
        interestSavings,
        netCost,
        balance,
        worthIt: balance > 0,
        breakEvenCost: interestSavings,
      })
    }
  }

  // "What does each prepayment buy me?": rerun the simulation without it, keeping the rest
  const prepaymentEffects: PrepaymentEffect[] = []
  let prepaymentInterestSavings = 0
  if (computable && mortgage.prepayments.length > 0) {
    const withoutAny = simulateMortgage({ ...baseOptions, bindings: activeBindings(mortgage), includePrepayments: false })
    prepaymentInterestSavings = withoutAny.totalInterest - simulation.totalInterest

    for (const prepayment of mortgage.prepayments) {
      const withoutThisOne = simulateMortgage({
        ...baseOptions,
        mortgage: {
          ...mortgage,
          prepayments: mortgage.prepayments.filter(item => item.id !== prepayment.id),
        },
        bindings: activeBindings(mortgage),
      })
      const fees = simulation.totalPrepaymentFees - withoutThisOne.totalPrepaymentFees
      const interestSavings = withoutThisOne.totalInterest - simulation.totalInterest
      prepaymentEffects.push({
        prepaymentId: prepayment.id,
        interestSavings,
        fees,
        netSaving: interestSavings - fees,
        monthsSaved: withoutThisOne.months - simulation.months,
      })
    }
  }

  const installments = simulation.schedule.map(row => row.installment)
  const rates = weightedRates(simulation)

  const totalCost = simulation.totalInterest
    + totalUpfrontCost
    + simulation.totalBindingNetCost
    + simulation.totalPrepaymentFees

  const opportunityCost = calculateOpportunityCost({
    propertyPrice: common.propertyPrice,
    availableCash: common.availableCash,
    principal,
    clientUpfrontCosts: totalUpfrontCost,
    years,
    expectedReturnPct: common.expectedReturnPct,
    capitalGainsTaxPct: common.capitalGainsTaxPct,
    enabled: common.opportunityCostEnabled,
  })

  if (!computable) {
    warnings.push('Capital o plazo no válidos: revisa los datos comunes o los de esta hipoteca.')
  }
  if (mortgage.floorPct !== null && mortgage.capPct !== null && mortgage.floorPct > mortgage.capPct) {
    warnings.push('El suelo está por encima del techo: revisa los límites del tipo.')
  }
  if (opportunityCost.negativeDownPayment) {
    warnings.push('El capital concedido supera el precio de la vivienda: la entrada sale negativa.')
  }
  if (opportunityCost.notAffordable) {
    warnings.push('Tu ahorro disponible no cubre la entrada más los gastos de esta oferta.')
  }
  const inactiveRequired = mortgage.bindings.filter(binding => binding.required && !binding.active)
  for (const binding of inactiveRequired) {
    warnings.push(`«${binding.name}» es obligatoria y está desactivada: el banco no concedería la hipoteca sin ella.`)
  }
  const renewedPremiums = simulation.preparedBindings.filter(prepared => prepared.singlePremiumRenewals > 0)
  for (const prepared of renewedPremiums) {
    const cost = prepared.binding.cost
    if (cost.mode !== 'singlePremium') continue
    warnings.push(
      `«${prepared.binding.name}»: la prima cubre ${cost.coverYears} de los ${years} años; se asume renovación al mismo precio.`,
    )
  }
  const cappedBonus = mortgage.maxBonusPp !== null
    && activeBindings(mortgage).reduce((sum, binding) => sum + binding.rateReductionPp, 0) > mortgage.maxBonusPp
  if (cappedBonus) {
    warnings.push(`La bonificación acumulada supera el tope de ${mortgage.maxBonusPp} pp y se ha recortado.`)
  }

  return {
    mortgage,
    principal,
    termMonths,
    years,
    simulation,
    initialInstallment: installments[0] ?? 0,
    averageInstallment: installments.length
      ? installments.reduce((sum, value) => sum + value, 0) / installments.length
      : 0,
    maxInstallment: installments.length ? Math.max(...installments) : 0,
    finalInstallment: installments[installments.length - 1] ?? 0,
    totalInterest: simulation.totalInterest,
    clientUpfrontCost,
    openingFee,
    totalUpfrontCost,
    totalBindingGrossCost: simulation.totalBindingGrossCost,
    totalBindingNetCost: simulation.totalBindingNetCost,
    totalPrepaymentFees: simulation.totalPrepaymentFees,
    totalCost,
    totalOutlay: simulation.loanPrincipal + totalCost,
    averageNominalRatePct: rates.base,
    effectiveRatePct: rates.applied,
    ltv: common.appraisalValue > 0 ? (principal / common.appraisalValue) * 100 : 0,
    apr,
    aprByScenarioId,
    opportunityCost,
    netWorth: opportunityCost.netPortfolio - totalCost,
    bindingsWorthiness,
    prepaymentEffects,
    prepaymentInterestSavings,
    yearly: buildYearlySeries(simulation, years, totalUpfrontCost, opportunityCost, common),
    warnings,
    viable: computable && !opportunityCost.notAffordable && !opportunityCost.negativeDownPayment,
    computable,
  }
}

export type MortgageComparisonResult = {
  results: MortgageResult[]
  /** Ranking position by real APR, keyed by mortgage id (1 = best) */
  rankByApr: Record<string, number>
  rankByNetWorth: Record<string, number>
  bestByAprId: string | null
  bestByNetWorthId: string | null
  rankingMismatch: boolean
  /** First year in which the accumulated cost of the two best offers crosses */
  crossoverYear: number | null
  maxYears: number
}

function buildRanking(results: MortgageResult[], compare: (a: MortgageResult, b: MortgageResult) => number) {
  const ranked = results
    .filter(result => result.mortgage.enabled && result.viable)
    .sort(compare)
  const rank: Record<string, number> = {}
  ranked.forEach((result, index) => {
    rank[result.mortgage.id] = index + 1
  })
  return { rank, best: ranked[0] ?? null }
}

/**
 * Last year in which the cheaper offer changes hands. Teaser rates make the lines
 * cross more than once early on; the useful one is the crossing after which the
 * ordering no longer changes.
 */
function findCrossoverYear(a: MortgageResult, b: MortgageResult): number | null {
  const length = Math.min(a.yearly.cumulativeCost.length, b.yearly.cumulativeCost.length)
  if (length < 2) return null

  const signAt = (year: number) => Math.sign(a.yearly.cumulativeCost[year]! - b.yearly.cumulativeCost[year]!)
  const finalSign = signAt(length - 1)
  if (finalSign === 0) return null

  for (let year = length - 2; year >= 0; year--) {
    const sign = signAt(year)
    if (sign !== 0 && sign !== finalSign) return year + 1
  }
  return null
}

/**
 * Every mortgage gets a result, so its own tab can show numbers even when it is
 * disabled; only enabled and viable offers enter the rankings.
 */
export function calculateComparison(comparator: MortgageComparator): MortgageComparisonResult {
  const results = comparator.mortgages.map(mortgage => calculateMortgageResult(
    mortgage,
    comparator.common,
    comparator.scenarios,
    comparator.selectedScenarioId,
  ))

  const byApr = buildRanking(results, (a, b) => {
    if (a.apr.realApr === null) return 1
    if (b.apr.realApr === null) return -1
    return a.apr.realApr - b.apr.realApr
  })
  const byNetWorth = buildRanking(results, (a, b) => b.netWorth - a.netWorth)

  const rankedByApr = results
    .filter(result => result.mortgage.enabled && result.viable && result.apr.realApr !== null)
    .sort((a, b) => a.apr.realApr! - b.apr.realApr!)

  const crossoverYear = rankedByApr.length >= 2
    ? findCrossoverYear(rankedByApr[0]!, rankedByApr[1]!)
    : null

  return {
    results,
    rankByApr: byApr.rank,
    rankByNetWorth: byNetWorth.rank,
    bestByAprId: byApr.best?.mortgage.id ?? null,
    bestByNetWorthId: byNetWorth.best?.mortgage.id ?? null,
    rankingMismatch: Boolean(byApr.best && byNetWorth.best && byApr.best.mortgage.id !== byNetWorth.best.mortgage.id),
    crossoverYear,
    maxYears: results.reduce((max, result) => Math.max(max, result.years), 0),
  }
}
