export type OpportunityCostInput = {
  propertyPrice: number
  availableCash: number
  /** Principal granted by this offer */
  principal: number
  /** Upfront costs paid by the client, opening fee included */
  clientUpfrontCosts: number
  years: number
  expectedReturnPct: number
  capitalGainsTaxPct: number
  enabled: boolean
}

export type OpportunityCostResult = {
  downPayment: number
  freeCapital: number
  finalPortfolio: number
  capitalGains: number
  capitalGainsTax: number
  netPortfolio: number
  /** The savings do not cover the down payment plus the upfront costs */
  notAffordable: boolean
  /** The loan is bigger than the price of the property */
  negativeDownPayment: boolean
}

export function calculateOpportunityCost(input: OpportunityCostInput): OpportunityCostResult {
  const downPayment = input.propertyPrice - input.principal
  const freeCapital = input.availableCash - downPayment - input.clientUpfrontCosts

  const growth = input.enabled ? (1 + input.expectedReturnPct / 100) ** input.years : 1
  const finalPortfolio = freeCapital > 0 ? freeCapital * growth : freeCapital
  const capitalGains = Math.max(0, finalPortfolio - freeCapital)
  const capitalGainsTax = capitalGains * (input.capitalGainsTaxPct / 100)

  return {
    downPayment,
    freeCapital,
    finalPortfolio,
    capitalGains,
    capitalGainsTax,
    netPortfolio: finalPortfolio - capitalGainsTax,
    notAffordable: freeCapital < 0,
    negativeDownPayment: downPayment < 0,
  }
}
