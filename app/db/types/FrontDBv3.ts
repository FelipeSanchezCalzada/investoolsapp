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

export type FinancialFreedomExpense = {
  id: string
  name: string
  monthlyAmount: number
  fromYear: number | null // null means From financial freedom
  toYear: number | null // null means no limit
  fromFinancialFreedom: boolean
}

type FinancialFreedomCalculatorInputs = {
  initialAmount: number
  monthlyDCA: number
  currentAge: number
  maxAge: number
  expenses: FinancialFreedomExpense[]
}

export type MortgageRateType = 'fixed' | 'variable' | 'mixed'

export type MortgageBindingType
  = | 'nomina' | 'recibosDomiciliados' | 'tarjetaDebito' | 'tarjetaCredito'
    | 'cuentaMantenimiento' | 'seguroHogar' | 'seguroVida'
    | 'seguroProteccionPagos' | 'seguroSalud' | 'seguroCoche' | 'alarma'
    | 'planPensiones' | 'inversionFondos' | 'cuentaValores' | 'otro'

export type MortgageBindingCostMode
  = 'free' | 'annual' | 'permille' | 'singlePremium' | 'investment'

/** No cost: payroll, direct debits, debit card */
export type MortgageBindingCostFree = { mode: 'free' }

/** Yearly premium or fee: insurance, alarm, credit card */
export type MortgageBindingCostAnnual = {
  mode: 'annual'
  bankCost: number
  /** What you would spend on this if the mortgage did not exist (0 if you would not buy it) */
  marketCost: number
  /** Yearly cost growth, in % */
  growthPct: number
  /** Bank discount on the first year, in % ("first year free" promos) */
  bankFirstYearDiscountPct: number
}

/** Tied to the outstanding principal: mortgage life insurance */
export type MortgageBindingCostPermille = {
  mode: 'permille'
  permille: number
  marketPermille: number
}

/** Single premium, optionally financed within the loan */
export type MortgageBindingCostSinglePremium = {
  mode: 'singlePremium'
  amount: number
  marketAmount: number
  /** Added to the loan principal, so it accrues interest */
  financed: boolean
  /** Years covered by the premium; it is renewed at the same price when it expires */
  coverYears: number
}

/** Funds, pension plans, managed portfolios */
export type MortgageBindingCostInvestment = {
  mode: 'investment'
  initialContribution: number
  annualContribution: number
  /** Total yearly fee of the bank product, in % */
  bankFeePct: number
  /** Fee of the product you would buy on your own, in % */
  alternativeFeePct: number
  /** Expected gross return of the product; null = inherits common.expectedReturnPct */
  expectedReturnPct: number | null
  /** Extra return expected to be lost because of worse management, in % */
  bankReturnGapPct: number
  /** false = you would not have invested that money, so it also gets locked up */
  wouldInvestAnyway: boolean
  minYears: number
  exitPenaltyPct: number
  /** Pension plans only: income tax deduction at the marginal rate, in % */
  taxDeductionPct: number
}

export type MortgageBindingCost
  = | MortgageBindingCostFree
    | MortgageBindingCostAnnual
    | MortgageBindingCostPermille
    | MortgageBindingCostSinglePremium
    | MortgageBindingCostInvestment

export type MortgageBinding = {
  id: string
  name: string
  type: MortgageBindingType
  /** Mandatory condition to get the loan approved */
  required: boolean
  /** The user buys it in the simulation */
  active: boolean
  /** Rate reduction in percentage points over the nominal rate */
  rateReductionPp: number
  /** Cost model; the net attributable cost may be negative */
  cost: MortgageBindingCost
  /** Validity within the loan (year 0 = signature; toYear null = whole life) */
  fromYear: number
  toYear: number | null
  /** Condition to keep the bonus (minimum income, minimum spending…). Informative only */
  requirement?: string
  notes?: string
}

/** Upfront cost concepts with an amount in euros */
export type MortgageUpfrontCostKey
  = | 'appraisal' | 'notary' | 'registry' | 'agency' | 'ajd' | 'brokerFee' | 'other'

export type MortgageUpfrontCosts = {
  amounts: Record<MortgageUpfrontCostKey, number>
  /** Who pays each concept; only the client ones enter the IRR cash flow */
  paidBy: Record<MortgageUpfrontCostKey, 'client' | 'bank'>
  /** Opening fee (% over principal); always paid by the client */
  openingFeePct: number
}

/** Early repayment fee tier: applies when fromYear <= year < toYear */
export type MortgageFeeTier = {
  fromYear: number
  /** null = until the end of the loan */
  toYear: number | null
  pct: number
}

export type MortgageEarlyRepaymentFees = {
  partial: MortgageFeeTier[]
  total: MortgageFeeTier[]
}

export type MortgagePrepayment = {
  id: string
  /** Month since signature */
  month: number
  amount: number
  mode: 'reduceTerm' | 'reduceInstallment'
  /** Repeat every N months until the end of the loan (null = one-off payment) */
  recurringEveryMonths: number | null
}

export type Mortgage = {
  id: string
  /** "BBVA fija 2,45%" */
  name: string
  bankName: string
  /** Color used in the charts */
  color: string
  /** Included in the comparison */
  enabled: boolean

  /** Principal and term: null = inherits the common value of the comparison */
  principal: number | null
  termMonths: number | null

  rateType: MortgageRateType
  /** Fixed: single nominal rate. Mixed: rate of the fixed tranche */
  fixedRatePct: number
  /** Mixed: length of the fixed tranche, in months */
  mixedFixedMonths: number
  /** Variable/mixed: rate of the initial period and its length */
  initialRatePct: number
  initialRateMonths: number
  /** Variable/mixed: spread over the index */
  spreadPct: number
  /** 6 | 12 */
  reviewEveryMonths: number
  floorPct: number | null
  capPct: number | null
  /** Maximum accumulated bonus (pp), null = no cap */
  maxBonusPp: number | null

  bindings: MortgageBinding[]
  upfrontCosts: MortgageUpfrontCosts
  earlyRepaymentFees: MortgageEarlyRepaymentFees
  prepayments: MortgagePrepayment[]
}

export type MortgageIndexScenario = {
  id: string
  name: string
  /** Points (year since signature, index value in %); linear interpolation */
  points: { year: number, valuePct: number }[]
}

export type MortgageComparatorCommon = {
  principal: number
  termMonths: number
  /** Purchase price of the property */
  propertyPrice: number
  /** Appraisal value, used for the LTV */
  appraisalValue: number
  /** Available savings for the down payment and the upfront costs */
  availableCash: number
  /** Today's Euribor, in %; seed of the three predefined scenarios */
  currentIndexPct: number
  /** Simulate the investment of the free capital left by each offer */
  opportunityCostEnabled: boolean
  /** Expected yearly return of the invested free capital, in % */
  expectedReturnPct: number
  /** Capital gains tax on sale, in % (19 by default) */
  capitalGainsTaxPct: number
}

export type MortgageComparator = {
  mortgages: Mortgage[]
  scenarios: MortgageIndexScenario[]
  selectedScenarioId: string
  /** Common data of the comparison; each mortgage may override principal and term */
  common: MortgageComparatorCommon
}

export type FrontDBv3 = {
  selectedWorkspaceName?: string
  workspaces: {
    name: string
    description: string
    portfolioRebalancingHelper?: PortfolioRebalancingHelper
    sp500Calculator?: SP500CalculatorInputs
    financialFreedomCalculator?: FinancialFreedomCalculatorInputs
    mortgageComparator?: MortgageComparator
  }[]
}
