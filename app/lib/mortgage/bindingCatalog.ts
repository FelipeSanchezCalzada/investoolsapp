import type {
  MortgageBinding,
  MortgageBindingCost,
  MortgageBindingCostMode,
  MortgageBindingType,
} from '~/db/types/FrontDBv3'

export type BindingCatalogEntry = {
  type: MortgageBindingType
  defaultRateReductionPp: number
  defaultRequired: boolean
  createCost: () => MortgageBindingCost
}

export const BINDING_COST_MODES: MortgageBindingCostMode[] = [
  'free', 'annual', 'permille', 'singlePremium', 'investment',
]

/** i18n key of a cost model, resolved by the component that renders it. */
export function bindingCostModeKey(mode: MortgageBindingCostMode): string {
  return `mortgage.bindings.costModes.${mode}`
}

/** i18n key of a catalog entry label. */
export function bindingLabelKey(type: MortgageBindingType): string {
  return `mortgage.bindings.catalog.${type}.label`
}

/** i18n key of the help text shown when adding a catalog entry. */
export function bindingHintKey(type: MortgageBindingType): string {
  return `mortgage.bindings.catalog.${type}.hint`
}

export function createFreeCost(): MortgageBindingCost {
  return { mode: 'free' }
}

export function createAnnualCost(bankCost = 0, marketCost = 0, bankFirstYearDiscountPct = 0): MortgageBindingCost {
  return { mode: 'annual', bankCost, marketCost, growthPct: 2, bankFirstYearDiscountPct }
}

export function createPermilleCost(): MortgageBindingCost {
  return { mode: 'permille', permille: 2.5, marketPermille: 1 }
}

export function createSinglePremiumCost(): MortgageBindingCost {
  return { mode: 'singlePremium', amount: 4000, marketAmount: 0, financed: true, coverYears: 10 }
}

export function createInvestmentCost(annualContribution = 1500, bankFeePct = 1.5): MortgageBindingCost {
  return {
    mode: 'investment',
    initialContribution: 0,
    annualContribution,
    bankFeePct,
    alternativeFeePct: 0.25,
    expectedReturnPct: null,
    bankReturnGapPct: 0,
    wouldInvestAnyway: true,
    minYears: 0,
    exitPenaltyPct: 0,
    taxDeductionPct: 0,
  }
}

/** Empty cost object of a given mode, used when the user switches the cost model. */
export function createCostForMode(mode: MortgageBindingCostMode): MortgageBindingCost {
  switch (mode) {
    case 'free': return createFreeCost()
    case 'annual': return createAnnualCost()
    case 'permille': return createPermilleCost()
    case 'singlePremium': return createSinglePremiumCost()
    case 'investment': return createInvestmentCost()
  }
}

export const BINDING_CATALOG: BindingCatalogEntry[] = [
  {
    type: 'nomina',
    defaultRateReductionPp: 0.5,
    defaultRequired: false,
    createCost: createFreeCost,
  },
  {
    type: 'recibosDomiciliados',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: createFreeCost,
  },
  {
    type: 'tarjetaDebito',
    defaultRateReductionPp: 0.05,
    defaultRequired: false,
    createCost: createFreeCost,
  },
  {
    type: 'tarjetaCredito',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: () => createAnnualCost(40, 0, 100),
  },
  {
    type: 'cuentaMantenimiento',
    defaultRateReductionPp: 0,
    defaultRequired: false,
    createCost: () => createAnnualCost(60, 0),
  },
  {
    type: 'seguroHogar',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: () => createAnnualCost(380, 180),
  },
  {
    type: 'seguroVida',
    defaultRateReductionPp: 0.3,
    defaultRequired: false,
    createCost: () => createAnnualCost(420, 0),
  },
  {
    type: 'seguroProteccionPagos',
    defaultRateReductionPp: 0.15,
    defaultRequired: false,
    createCost: () => createAnnualCost(350, 0),
  },
  {
    type: 'seguroSalud',
    defaultRateReductionPp: 0.15,
    defaultRequired: false,
    createCost: () => createAnnualCost(600, 0),
  },
  {
    type: 'seguroCoche',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: () => createAnnualCost(400, 480),
  },
  {
    type: 'alarma',
    defaultRateReductionPp: 0.05,
    defaultRequired: false,
    createCost: () => createAnnualCost(450, 0),
  },
  {
    type: 'planPensiones',
    defaultRateReductionPp: 0.15,
    defaultRequired: false,
    createCost: () => {
      const cost = createInvestmentCost(1500, 1.5)
      if (cost.mode === 'investment') {
        cost.taxDeductionPct = 30
        cost.wouldInvestAnyway = true
      }
      return cost
    },
  },
  {
    type: 'inversionFondos',
    defaultRateReductionPp: 0.2,
    defaultRequired: false,
    createCost: () => {
      const cost = createInvestmentCost(3000, 1.6)
      if (cost.mode === 'investment') {
        cost.minYears = 3
        cost.exitPenaltyPct = 2
      }
      return cost
    },
  },
  {
    type: 'cuentaValores',
    defaultRateReductionPp: 0.05,
    defaultRequired: false,
    createCost: () => createAnnualCost(120, 0),
  },
  {
    type: 'otro',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: createAnnualCost,
  },
]

export function findCatalogEntry(type: MortgageBindingType): BindingCatalogEntry | undefined {
  return BINDING_CATALOG.find(entry => entry.type === type)
}

export function createBindingFromCatalog(entry: BindingCatalogEntry, name: string): MortgageBinding {
  return {
    id: crypto.randomUUID(),
    name,
    type: entry.type,
    required: entry.defaultRequired,
    active: true,
    rateReductionPp: entry.defaultRateReductionPp,
    cost: entry.createCost(),
    fromYear: 0,
    toYear: null,
  }
}
