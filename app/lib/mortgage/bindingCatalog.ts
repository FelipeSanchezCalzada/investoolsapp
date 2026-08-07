import type {
  MortgageBinding,
  MortgageBindingCost,
  MortgageBindingCostMode,
  MortgageBindingType,
} from '~/db/types/FrontDBv3'

export type BindingCatalogEntry = {
  type: MortgageBindingType
  label: string
  /** Shown as help text when adding the binding */
  hint: string
  defaultRateReductionPp: number
  defaultRequired: boolean
  createCost: () => MortgageBindingCost
}

export const BINDING_COST_MODE_LABELS: Record<MortgageBindingCostMode, string> = {
  free: 'Sin coste',
  annual: 'Cuota o prima anual',
  permille: 'Por mil sobre capital pendiente',
  singlePremium: 'Prima única',
  investment: 'Producto de inversión',
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
    label: 'Nómina domiciliada',
    hint: 'La más rentable: coste 0. Suele exigir un ingreso mínimo mensual y, con dos titulares, ambas nóminas.',
    defaultRateReductionPp: 0.5,
    defaultRequired: false,
    createCost: createFreeCost,
  },
  {
    type: 'recibosDomiciliados',
    label: 'Recibos domiciliados',
    hint: 'Luz, agua, gas o teléfono. Coste 0; a veces exige un número mínimo de recibos.',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: createFreeCost,
  },
  {
    type: 'tarjetaDebito',
    label: 'Tarjeta de débito',
    hint: 'Normalmente gratuita.',
    defaultRateReductionPp: 0.05,
    defaultRequired: false,
    createCost: createFreeCost,
  },
  {
    type: 'tarjetaCredito',
    label: 'Tarjeta de crédito',
    hint: 'Cuota anual habitual de 30–50 €, a menudo gratis el primer año. Si exige un gasto mínimo que harías igual, el coste fuera es 0.',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: () => createAnnualCost(40, 0, 100),
  },
  {
    type: 'cuentaMantenimiento',
    label: 'Cuenta con mantenimiento',
    hint: 'Comisión de mantenimiento si se dejan de cumplir los requisitos de la cuenta.',
    defaultRateReductionPp: 0,
    defaultRequired: false,
    createCost: () => createAnnualCost(60, 0),
  },
  {
    type: 'seguroHogar',
    label: 'Seguro de hogar',
    hint: 'El continente es obligatorio por ley con hipoteca, así que el coste fuera casi nunca es 0.',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: () => createAnnualCost(380, 180),
  },
  {
    type: 'seguroVida',
    label: 'Seguro de vida / amortización',
    hint: 'No es obligatorio por ley aunque el banco lo presente como tal. Variante habitual: prima única financiada.',
    defaultRateReductionPp: 0.3,
    defaultRequired: false,
    createCost: () => createAnnualCost(420, 0),
  },
  {
    type: 'seguroProteccionPagos',
    label: 'Seguro de protección de pagos',
    hint: 'Casi nadie lo contrataría fuera, así que el coste se imputa íntegro. Coberturas con muchas exclusiones.',
    defaultRateReductionPp: 0.15,
    defaultRequired: false,
    createCost: () => createAnnualCost(350, 0),
  },
  {
    type: 'seguroSalud',
    label: 'Seguro de salud',
    hint: 'Coste fuera 0 si no lo querrías; igual a tu póliza actual si ya la tienes.',
    defaultRateReductionPp: 0.15,
    defaultRequired: false,
    createCost: () => createAnnualCost(600, 0),
  },
  {
    type: 'seguroCoche',
    label: 'Seguro de coche',
    hint: 'Frecuentemente neto negativo: si el del banco es más barato que el tuyo, ahorras.',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: () => createAnnualCost(400, 480),
  },
  {
    type: 'alarma',
    label: 'Alarma / seguridad',
    hint: 'Cuota mensual de 30–45 €, por encima del mercado. Coste fuera 0 salvo que ya tengas alarma.',
    defaultRateReductionPp: 0.05,
    defaultRequired: false,
    createCost: () => createAnnualCost(450, 0),
  },
  {
    type: 'planPensiones',
    label: 'Plan de pensiones',
    hint: 'La aportación no es gasto, es ahorro tuyo. El coste real son las comisiones frente a tu alternativa, más la iliquidez.',
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
    label: 'Fondos de inversión / cartera gestionada',
    hint: 'Comisión típica del banco 1,2–1,9 % frente a 0,2–0,4 % de un indexado. Suele llevar permanencia mínima.',
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
    label: 'Cuenta de valores / bróker del banco',
    hint: 'Custodia y comisiones de compraventa frente a tu bróker actual.',
    defaultRateReductionPp: 0.05,
    defaultRequired: false,
    createCost: () => createAnnualCost(120, 0),
  },
  {
    type: 'otro',
    label: 'Otro',
    hint: 'Libre, para lo que se invente cada banco.',
    defaultRateReductionPp: 0.1,
    defaultRequired: false,
    createCost: createAnnualCost,
  },
]

export function findCatalogEntry(type: MortgageBindingType): BindingCatalogEntry | undefined {
  return BINDING_CATALOG.find(entry => entry.type === type)
}

export function createBindingFromCatalog(entry: BindingCatalogEntry): MortgageBinding {
  return {
    id: crypto.randomUUID(),
    name: entry.label,
    type: entry.type,
    required: entry.defaultRequired,
    active: true,
    rateReductionPp: entry.defaultRateReductionPp,
    cost: entry.createCost(),
    fromYear: 0,
    toYear: null,
  }
}
