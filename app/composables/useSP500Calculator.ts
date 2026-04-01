import useFrontDB from '~/db/useFrontDB'

interface SP500DataPoint {
  date: Date
  value: number
}

interface YearRange {
  startYear: number
  endYear: number
}

interface SimulationResult {
  labels: string[]
  invested: number[]
  worstCase: number[]
  bestCase: number[]
  currentCase: number[]
  worstCaseRange: YearRange
  bestCaseRange: YearRange
  currentCaseRange: YearRange
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

function simulateWindow(
  prices: number[],
  initialAmount: number,
  monthlyDCA: number,
): number[] {
  const values: number[] = []
  let shares = initialAmount / prices[0]!

  values.push(shares * prices[0]!)

  for (let m = 1; m < prices.length; m++) {
    shares += monthlyDCA / prices[m]!
    values.push(shares * prices[m]!)
  }

  return values
}

const sp500Data = ref<SP500DataPoint[]>([])
const isLoading = ref(false)
const results = ref<SimulationResult | null>(null)

const DEFAULT_CALCULATOR_DATA = {
  initialAmount: 10000,
  monthlyDCA: 500,
  years: 10,
}

export function useSP500Calculator() {
  const { selectedWorkspace } = storeToRefs(useFrontDB())

  // Ensure calculator data exists on workspace
  watchImmediate(selectedWorkspace, (ws) => {
    if (ws && !ws.sp500Calculator) {
      ws.sp500Calculator = { ...DEFAULT_CALCULATOR_DATA }
    }
  })

  async function loadData() {
    if (sp500Data.value.length > 0) return
    const response = await fetch('/sp500_prices.csv')
    const raw = await response.text()
    sp500Data.value = parseCSV(raw)
  }

  function calculate(initialAmount: number, monthlyDCA: number, years: number) {
    isLoading.value = true
    results.value = null

    requestAnimationFrame(() => {
      try {
        const data = sp500Data.value
        const months = years * 12
        const windowSize = months + 1

        if (data.length < windowSize) {
          isLoading.value = false
          return
        }

        let worstFinal = Infinity
        let bestFinal = -Infinity
        let worstWindow: number[] = []
        let bestWindow: number[] = []
        let worstStart = 0
        let bestStart = 0

        const totalWindows = data.length - windowSize + 1

        for (let start = 0; start < totalWindows; start++) {
          const prices = data.slice(start, start + windowSize).map(d => d.value)
          const sim = simulateWindow(prices, initialAmount, monthlyDCA)
          const finalValue = sim[sim.length - 1]!

          if (finalValue < worstFinal) {
            worstFinal = finalValue
            worstWindow = sim
            worstStart = start
          }
          if (finalValue > bestFinal) {
            bestFinal = finalValue
            bestWindow = sim
            bestStart = start
          }
        }

        const currentStart = data.length - windowSize
        const currentPrices = data.slice(-windowSize).map(d => d.value)
        const currentWindow = simulateWindow(currentPrices, initialAmount, monthlyDCA)

        const invested: number[] = []
        for (let m = 0; m <= months; m++) {
          invested.push(initialAmount + monthlyDCA * m)
        }

        const labels: string[] = []
        for (let m = 0; m <= months; m++) {
          if (m % 12 === 0) {
            labels.push(`Año ${m / 12}`)
          } else {
            labels.push('')
          }
        }

        const rangeOf = (start: number): YearRange => ({
          startYear: data[start]!.date.getFullYear(),
          endYear: data[start + windowSize - 1]!.date.getFullYear(),
        })

        results.value = {
          labels,
          invested,
          worstCase: worstWindow,
          bestCase: bestWindow,
          currentCase: currentWindow,
          worstCaseRange: rangeOf(worstStart),
          bestCaseRange: rangeOf(bestStart),
          currentCaseRange: rangeOf(currentStart),
        }
      } finally {
        isLoading.value = false
      }
    })
  }

  // Auto-load data on first use
  onMounted(() => loadData())

  // Auto-recalculate when data is loaded and inputs change
  watch(
    () => {
      if (sp500Data.value.length === 0) return null
      const calc = selectedWorkspace.value?.sp500Calculator
      if (!calc) return null
      return { initialAmount: calc.initialAmount, monthlyDCA: calc.monthlyDCA, years: calc.years }
    },
    (calc) => {
      if (!calc) return
      if ((calc.initialAmount > 0 || calc.monthlyDCA > 0) && calc.years > 0) {
        calculate(calc.initialAmount, calc.monthlyDCA, calc.years)
      }
    },
    { immediate: true },
  )

  return {
    isLoading,
    results,
  }
}
