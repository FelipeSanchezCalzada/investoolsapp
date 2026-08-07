import type {
  Mortgage,
  MortgageComparator,
  MortgageComparatorCommon,
  MortgageEarlyRepaymentFees,
  MortgageIndexScenario,
  MortgageRateType,
  MortgageUpfrontCosts,
} from '~/db/types/FrontDBv3'
import { createAnnualCost, createFreeCost, createInvestmentCost } from '~/lib/mortgage/bindingCatalog'

/** Rotating palette with enough contrast in both light and dark mode. */
export const MORTGAGE_COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#a855f7',
  '#ef4444',
  '#14b8a6',
  '#eab308',
  '#ec4899',
]

export function colorForIndex(index: number): string {
  return MORTGAGE_COLORS[index % MORTGAGE_COLORS.length]!
}

export const SCENARIO_IDS = {
  CURRENT: 'current',
  OPTIMISTIC: 'optimistic',
  PESSIMISTIC: 'pessimistic',
  CUSTOM: 'custom',
}

/**
 * The three predefined scenarios are derived from the Euribor the user types in,
 * so no market value is hardcoded and nothing ages silently.
 * The ±1 pp shift over 5 years is a sensitivity convention, not a forecast.
 */
export function createSeedScenarios(currentIndexPct: number): MortgageIndexScenario[] {
  return [
    {
      id: SCENARIO_IDS.CURRENT,
      name: 'Actual (constante)',
      points: [{ year: 0, valuePct: currentIndexPct }],
    },
    {
      id: SCENARIO_IDS.OPTIMISTIC,
      name: 'Optimista (−1 pp en 5 años)',
      points: [
        { year: 0, valuePct: currentIndexPct },
        { year: 5, valuePct: Math.max(0, currentIndexPct - 1) },
      ],
    },
    {
      id: SCENARIO_IDS.PESSIMISTIC,
      name: 'Pesimista (+1 pp en 5 años)',
      points: [
        { year: 0, valuePct: currentIndexPct },
        { year: 5, valuePct: currentIndexPct + 1 },
      ],
    },
    {
      id: SCENARIO_IDS.CUSTOM,
      name: 'Personalizado',
      points: [
        { year: 0, valuePct: currentIndexPct },
        { year: 10, valuePct: currentIndexPct },
      ],
    },
  ]
}

export function createDefaultCommon(): MortgageComparatorCommon {
  return {
    principal: 200000,
    termMonths: 360,
    propertyPrice: 250000,
    appraisalValue: 250000,
    availableCash: 80000,
    currentIndexPct: 2.5,
    opportunityCostEnabled: true,
    expectedReturnPct: 7,
    capitalGainsTaxPct: 19,
  }
}

/** LCCI (Ley 5/2019): the bank pays notary, registry, agency and AJD. */
export function createDefaultUpfrontCosts(): MortgageUpfrontCosts {
  return {
    amounts: { appraisal: 350, notary: 0, registry: 0, agency: 0, ajd: 0, brokerFee: 0, other: 0 },
    paidBy: {
      appraisal: 'client',
      notary: 'bank',
      registry: 'bank',
      agency: 'bank',
      ajd: 'bank',
      brokerFee: 'client',
      other: 'client',
    },
    openingFeePct: 0,
  }
}

/** LCCI caps, preloaded by rate type and editable afterwards. */
export function createDefaultEarlyRepaymentFees(rateType: MortgageRateType): MortgageEarlyRepaymentFees {
  if (rateType === 'variable') {
    const tiers = [
      { fromYear: 0, toYear: 3, pct: 0.25 },
      { fromYear: 3, toYear: null, pct: 0 },
    ]
    return { partial: tiers, total: tiers.map(tier => ({ ...tier })) }
  }

  const tiers = [
    { fromYear: 0, toYear: 10, pct: 2 },
    { fromYear: 10, toYear: null, pct: 1.5 },
  ]
  return { partial: tiers, total: tiers.map(tier => ({ ...tier })) }
}

export function createMortgage(index: number, rateType: MortgageRateType = 'fixed'): Mortgage {
  return {
    id: crypto.randomUUID(),
    name: `Hipoteca ${index + 1}`,
    bankName: '',
    color: colorForIndex(index),
    enabled: true,
    principal: null,
    termMonths: null,
    rateType,
    fixedRatePct: 2.6,
    mixedFixedMonths: 60,
    initialRatePct: 2.2,
    initialRateMonths: 12,
    spreadPct: 0.6,
    reviewEveryMonths: 12,
    floorPct: null,
    capPct: null,
    maxBonusPp: null,
    bindings: [],
    upfrontCosts: createDefaultUpfrontCosts(),
    earlyRepaymentFees: createDefaultEarlyRepaymentFees(rateType),
    prepayments: [],
  }
}

/**
 * Plausible Spanish market figures so the tool is understandable on first open.
 * They are not a real offer nor a recommendation.
 */
export function createExampleMortgages(): Mortgage[] {
  const fixed = createMortgage(0, 'fixed')
  fixed.name = 'Banco A · fija'
  fixed.bankName = 'Banco A'
  fixed.fixedRatePct = 2.6
  fixed.bindings = [
    {
      id: crypto.randomUUID(),
      name: 'Nómina domiciliada',
      type: 'nomina',
      required: true,
      active: true,
      rateReductionPp: 0.4,
      cost: createFreeCost(),
      fromYear: 0,
      toYear: null,
      requirement: 'Ingreso mínimo de 1.200 €/mes',
    },
    {
      id: crypto.randomUUID(),
      name: 'Seguro de hogar',
      type: 'seguroHogar',
      required: false,
      active: true,
      rateReductionPp: 0.1,
      cost: createAnnualCost(380, 180),
      fromYear: 0,
      toYear: null,
    },
    {
      id: crypto.randomUUID(),
      name: 'Seguro de vida',
      type: 'seguroVida',
      required: false,
      active: true,
      rateReductionPp: 0.2,
      cost: createAnnualCost(420, 0),
      fromYear: 0,
      toYear: null,
    },
  ]

  const variable = createMortgage(1, 'variable')
  variable.name = 'Banco B · variable'
  variable.bankName = 'Banco B'
  variable.initialRatePct = 2.2
  variable.initialRateMonths = 12
  variable.spreadPct = 0.6
  variable.reviewEveryMonths = 12
  variable.upfrontCosts.openingFeePct = 0.25
  variable.bindings = [
    {
      id: crypto.randomUUID(),
      name: 'Nómina domiciliada',
      type: 'nomina',
      required: true,
      active: true,
      rateReductionPp: 0.4,
      cost: createFreeCost(),
      fromYear: 0,
      toYear: null,
      requirement: 'Ingreso mínimo de 1.200 €/mes',
    },
    {
      id: crypto.randomUUID(),
      name: 'Seguro de hogar',
      type: 'seguroHogar',
      required: false,
      active: true,
      rateReductionPp: 0.1,
      cost: createAnnualCost(380, 180),
      fromYear: 0,
      toYear: null,
    },
    {
      id: crypto.randomUUID(),
      name: 'Seguro de vida',
      type: 'seguroVida',
      required: false,
      active: true,
      rateReductionPp: 0.2,
      cost: createAnnualCost(420, 0),
      fromYear: 0,
      toYear: null,
    },
    {
      id: crypto.randomUUID(),
      name: 'Tarjeta de crédito',
      type: 'tarjetaCredito',
      required: false,
      active: true,
      rateReductionPp: 0.1,
      cost: createAnnualCost(40, 0, 100),
      fromYear: 0,
      toYear: null,
    },
    {
      id: crypto.randomUUID(),
      name: 'Plan de pensiones',
      type: 'planPensiones',
      required: false,
      active: true,
      rateReductionPp: 0.15,
      cost: createInvestmentCost(1500, 1.5),
      fromYear: 0,
      toYear: null,
    },
  ]

  return [fixed, variable]
}

export function createDefaultComparator(): MortgageComparator {
  const common = createDefaultCommon()
  return {
    mortgages: [],
    scenarios: createSeedScenarios(common.currentIndexPct),
    selectedScenarioId: SCENARIO_IDS.CURRENT,
    common,
  }
}
