const TOLERANCE = 1e-10
const MAX_ITERATIONS = 100
const MIN_RATE = -0.9
const MAX_RATE = 1.0

function netPresentValue(cashFlows: number[], rate: number): number {
  let npv = 0
  for (let t = 0; t < cashFlows.length; t++) {
    npv += cashFlows[t]! / (1 + rate) ** t
  }
  return npv
}

function netPresentValueDerivative(cashFlows: number[], rate: number): number {
  let derivative = 0
  for (let t = 1; t < cashFlows.length; t++) {
    derivative -= (t * cashFlows[t]!) / (1 + rate) ** (t + 1)
  }
  return derivative
}

/**
 * Monthly IRR of a series of cash flows (index = month since signature).
 * Bisection to bracket the sign change, then Newton-Raphson to refine.
 * Returns null when the flows are degenerate or the method does not converge.
 */
export function monthlyIrr(cashFlows: number[]): number | null {
  if (cashFlows.length < 2) return null

  const hasPositive = cashFlows.some(flow => flow > 0)
  const hasNegative = cashFlows.some(flow => flow < 0)
  if (!hasPositive || !hasNegative) return null

  let low = MIN_RATE
  let high = MAX_RATE
  let npvLow = netPresentValue(cashFlows, low)
  let npvHigh = netPresentValue(cashFlows, high)

  if (npvLow * npvHigh > 0) return null

  let rate = (low + high) / 2

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const npv = netPresentValue(cashFlows, rate)
    if (Math.abs(npv) < TOLERANCE) return rate

    if (npv * npvLow < 0) {
      high = rate
      npvHigh = npv
    } else {
      low = rate
      npvLow = npv
    }
    rate = (low + high) / 2
  }

  // Refine the bracketed root with Newton-Raphson, falling back to bisection
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const npv = netPresentValue(cashFlows, rate)
    if (Math.abs(npv) < TOLERANCE) return rate

    const derivative = netPresentValueDerivative(cashFlows, rate)
    if (derivative === 0) break

    const next = rate - npv / derivative
    if (!Number.isFinite(next) || next <= MIN_RATE || next >= MAX_RATE) break
    rate = next
  }

  const finalNpv = netPresentValue(cashFlows, rate)
  if (!Number.isFinite(finalNpv) || Math.abs(finalNpv) > 1e-4) return null
  return rate
}

/** Annual percentage rate (TAE) in %, from a monthly cash flow series. */
export function annualPercentageRatePct(cashFlows: number[]): number | null {
  const rate = monthlyIrr(cashFlows)
  if (rate === null) return null
  const apr = ((1 + rate) ** 12 - 1) * 100
  return Number.isFinite(apr) ? apr : null
}

export { netPresentValue }
