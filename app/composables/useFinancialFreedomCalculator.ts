import useFrontDB from '~/db/useFrontDB'
import type { FinancialFreedomExpense } from '~/db/types/FrontDBv3'

interface SP500DataPoint {
  date: Date
  value: number
}

interface YearRange {
  startYear: number
  endYear: number
}

interface SimulationYearPoint {
  year: number
  age: number
  portfolio: number
  invested: number
  yearlyExpenses: number
}

interface ScenarioResult {
  yearsToFreedom: number
  ageAtFreedom: number
  timeline: SimulationYearPoint[]
  range: YearRange
}

interface FinancialFreedomResult {
  worstCase: ScenarioResult
  bestCase: ScenarioResult
  currentCase: ScenarioResult
  labels: string[]
  worstCaseInvested: number[]
  bestCaseInvested: number[]
  currentCaseInvested: number[]
  worstCasePortfolio: number[]
  bestCasePortfolio: number[]
  currentCasePortfolio: number[]
}

function parseCSV(raw: string): SP500DataPoint[] {
  const lines = raw.trim().split('\n')
  const data: SP500DataPoint[] = []

  for (let i = 1; i < lines.length; i++) {
    const [dateStr, valueStr] = lines[i]!.split(';')
    if (!dateStr || !valueStr) continue

    const [month, day, year] = dateStr.split('/')
    const date = new Date(Number(year), Number(month) - 1, Number(day))
    const value = Number(valueStr.replace(',', '.'))

    if (!isNaN(value) && !isNaN(date.getTime())) {
      data.push({ date, value })
    }
  }

  return data
}

/**
 * Get annual returns from monthly SP500 data.
 * Each return is the ratio of price at end of 12-month period to start.
 */
function getAnnualReturns(data: SP500DataPoint[]): number[] {
  const returns: number[] = []
  for (let i = 0; i + 12 <= data.length; i += 12) {
    returns.push(data[i + 12 - 1]!.value / data[i]!.value)
  }
  return returns
}

/**
 * Calculate yearly expenses for a given year offset from financial freedom.
 * yearFromStart = years since simulation start
 * freedomYear = year offset when financial freedom is achieved
 */
function calcYearlyExpenses(
  expenses: FinancialFreedomExpense[],
  yearFromStart: number,
  freedomYear: number,
): number {
  let total = 0
  for (const expense of expenses) {
    const fromYear = expense.fromFinancialFreedom
      ? freedomYear
      : (expense.fromYear ?? 0)

    if (yearFromStart < fromYear) continue
    if (expense.toYear !== null && yearFromStart >= expense.toYear) continue

    total += expense.monthlyAmount * 12
  }
  return total
}

/**
 * Simulate a scenario with a specific sequence of annual returns.
 * Try increasing years of DCA contributions (1, 2, 3...) until we find
 * the minimum where the portfolio survives all expenses until maxAge.
 */
function simulateScenario(
  annualReturns: number[],
  initialAmount: number,
  monthlyDCA: number,
  currentAge: number,
  maxAge: number,
  expenses: FinancialFreedomExpense[],
): { yearsToFreedom: number, timeline: SimulationYearPoint[] } | null {
  const totalYearsNeeded = maxAge - currentAge
  const annualDCA = monthlyDCA * 12

  for (let freedomYear = 0; freedomYear <= totalYearsNeeded; freedomYear++) {
    // Check if we have enough return data for this scenario
    if (totalYearsNeeded > annualReturns.length) continue

    let portfolio = initialAmount
    const timeline: SimulationYearPoint[] = []
    let totalInvested = initialAmount
    let survived = true

    timeline.push({
      year: 0,
      age: currentAge,
      portfolio,
      invested: totalInvested,
      yearlyExpenses: 0,
    })

    for (let year = 1; year <= totalYearsNeeded; year++) {
      const returnIdx = (year - 1) % annualReturns.length
      const annualReturn = annualReturns[returnIdx]!

      // Apply market return
      portfolio *= annualReturn

      // Add DCA if still in contribution phase
      if (year <= freedomYear) {
        portfolio += annualDCA
        totalInvested += annualDCA
      }

      // Subtract expenses
      const yearExpenses = calcYearlyExpenses(expenses, year, freedomYear)
      portfolio -= yearExpenses

      timeline.push({
        year,
        age: currentAge + year,
        portfolio,
        invested: totalInvested,
        yearlyExpenses: yearExpenses,
      })

      if (portfolio <= 0) {
        survived = false
        break
      }
    }

    if (survived) {
      return { yearsToFreedom: freedomYear, timeline }
    }
  }

  return null
}

const sp500Data = ref<SP500DataPoint[]>([])
const isLoading = ref(false)
const results = ref<FinancialFreedomResult | null>(null)

const DEFAULT_CALCULATOR_DATA = {
  initialAmount: 10000,
  monthlyDCA: 500,
  currentAge: 30,
  maxAge: 85,
  expenses: [] as FinancialFreedomExpense[],
}

export function useFinancialFreedomCalculator() {
  const { selectedWorkspace } = storeToRefs(useFrontDB())
  const { t } = useI18n()

  watchImmediate(selectedWorkspace, (ws) => {
    if (ws && !ws.financialFreedomCalculator) {
      ws.financialFreedomCalculator = { ...DEFAULT_CALCULATOR_DATA, expenses: [] }
    }
  })

  async function loadData() {
    if (sp500Data.value.length > 0) return
    const response = await fetch('/sp500_prices.csv')
    const raw = await response.text()
    sp500Data.value = parseCSV(raw)
  }

  function calculate(
    initialAmount: number,
    monthlyDCA: number,
    currentAge: number,
    maxAge: number,
    expenses: FinancialFreedomExpense[],
  ) {
    isLoading.value = true
    results.value = null

    requestAnimationFrame(() => {
      try {
        const data = sp500Data.value
        const totalYears = maxAge - currentAge

        if (totalYears <= 0 || data.length < 24) {
          isLoading.value = false
          return
        }

        // Get all possible sequences of annual returns
        const annualReturns = getAnnualReturns(data)

        if (annualReturns.length < totalYears) {
          isLoading.value = false
          return
        }

        let worstResult: { yearsToFreedom: number, timeline: SimulationYearPoint[], startIdx: number } | null = null
        let bestResult: { yearsToFreedom: number, timeline: SimulationYearPoint[], startIdx: number } | null = null
        let currentResult: { yearsToFreedom: number, timeline: SimulationYearPoint[], startIdx: number } | null = null

        // Slide a window of totalYears annual returns
        const totalWindows = annualReturns.length - totalYears + 1

        for (let start = 0; start < totalWindows; start++) {
          const windowReturns = annualReturns.slice(start, start + totalYears)
          const sim = simulateScenario(
            windowReturns,
            initialAmount,
            monthlyDCA,
            currentAge,
            maxAge,
            expenses,
          )

          if (!sim) continue

          if (!worstResult || sim.yearsToFreedom > worstResult.yearsToFreedom) {
            worstResult = { ...sim, startIdx: start }
          }
          if (!bestResult || sim.yearsToFreedom < bestResult.yearsToFreedom) {
            bestResult = { ...sim, startIdx: start }
          }
        }

        // Current case: use the most recent window
        const currentStart = Math.max(0, annualReturns.length - totalYears)
        const currentReturns = annualReturns.slice(currentStart, currentStart + totalYears)
        const currentSim = simulateScenario(
          currentReturns,
          initialAmount,
          monthlyDCA,
          currentAge,
          maxAge,
          expenses,
        )

        if (currentSim) {
          currentResult = { ...currentSim, startIdx: currentStart }
        }

        if (!worstResult || !bestResult || !currentResult) {
          isLoading.value = false
          return
        }

        // Build chart data - use yearly points
        const labels: string[] = []
        const worstCaseInvested: number[] = []
        const bestCaseInvested: number[] = []
        const currentCaseInvested: number[] = []
        const worstCasePortfolio: number[] = []
        const bestCasePortfolio: number[] = []
        const currentCasePortfolio: number[] = []

        for (let y = 0; y <= totalYears; y++) {
          labels.push(t('financialFreedom.yearLabel', { year: y, age: currentAge + y }))
          worstCaseInvested.push(worstResult.timeline[y]?.invested ?? 0)
          bestCaseInvested.push(bestResult.timeline[y]?.invested ?? 0)
          currentCaseInvested.push(currentResult.timeline[y]?.invested ?? 0)
          worstCasePortfolio.push(worstResult.timeline[y]?.portfolio ?? 0)
          bestCasePortfolio.push(bestResult.timeline[y]?.portfolio ?? 0)
          currentCasePortfolio.push(currentResult.timeline[y]?.portfolio ?? 0)
        }

        // Calculate year ranges from monthly data
        const yearToDataYear = (startIdx: number) => {
          const monthIdx = startIdx * 12
          return {
            startYear: data[monthIdx]?.date.getFullYear() ?? 0,
            endYear: data[Math.min(monthIdx + totalYears * 12, data.length - 1)]?.date.getFullYear() ?? 0,
          }
        }

        results.value = {
          worstCase: {
            yearsToFreedom: worstResult.yearsToFreedom,
            ageAtFreedom: currentAge + worstResult.yearsToFreedom,
            timeline: worstResult.timeline,
            range: yearToDataYear(worstResult.startIdx),
          },
          bestCase: {
            yearsToFreedom: bestResult.yearsToFreedom,
            ageAtFreedom: currentAge + bestResult.yearsToFreedom,
            timeline: bestResult.timeline,
            range: yearToDataYear(bestResult.startIdx),
          },
          currentCase: {
            yearsToFreedom: currentResult.yearsToFreedom,
            ageAtFreedom: currentAge + currentResult.yearsToFreedom,
            timeline: currentResult.timeline,
            range: yearToDataYear(currentResult.startIdx),
          },
          labels,
          worstCaseInvested,
          bestCaseInvested,
          currentCaseInvested,
          worstCasePortfolio,
          bestCasePortfolio,
          currentCasePortfolio,
        }
      } finally {
        isLoading.value = false
      }
    })
  }

  onMounted(() => loadData())

  watch(
    () => {
      if (sp500Data.value.length === 0) return null
      const calc = selectedWorkspace.value?.financialFreedomCalculator
      if (!calc) return null
      return {
        initialAmount: calc.initialAmount,
        monthlyDCA: calc.monthlyDCA,
        currentAge: calc.currentAge,
        maxAge: calc.maxAge,
        expenses: JSON.stringify(calc.expenses),
      }
    },
    (calc) => {
      if (!calc) return
      const parsed = selectedWorkspace.value!.financialFreedomCalculator!
      if (calc.currentAge > 0 && calc.maxAge > calc.currentAge) {
        calculate(parsed.initialAmount, parsed.monthlyDCA, parsed.currentAge, parsed.maxAge, parsed.expenses)
      }
    },
    { immediate: true },
  )

  return {
    isLoading,
    results,
  }
}
