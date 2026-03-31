interface SP500DataPoint {
  date: Date
  value: number
}

interface SimulationResult {
  labels: string[]
  invested: number[]
  worstCase: number[]
  bestCase: number[]
  currentCase: number[]
}

function parseCSV(raw: string): SP500DataPoint[] {
  const lines = raw.trim().split('\n')
  const data: SP500DataPoint[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!.replace(/"/g, '')
    const [dateStr, valueStr] = line.split(';')
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

export function useSP500Calculator() {
  const sp500Data = ref<SP500DataPoint[]>([])
  const isLoading = ref(false)
  const results = ref<SimulationResult | null>(null)

  async function loadData() {
    if (sp500Data.value.length > 0) return
    const response = await fetch('/sp500_prices.csv')
    const raw = await response.text()
    sp500Data.value = parseCSV(raw)
  }

  function calculate(initialAmount: number, monthlyDCA: number, years: number) {
    isLoading.value = true
    results.value = null

    // Use requestAnimationFrame to let the UI update (show spinner)
    requestAnimationFrame(() => {
      try {
        const data = sp500Data.value
        const months = years * 12
        const windowSize = months + 1 // need N+1 points for N months of DCA

        if (data.length < windowSize) {
          isLoading.value = false
          return
        }

        // Simulate all possible windows
        let worstFinal = Infinity
        let bestFinal = -Infinity
        let worstWindow: number[] = []
        let bestWindow: number[] = []

        const totalWindows = data.length - windowSize + 1

        for (let start = 0; start < totalWindows; start++) {
          const prices = data.slice(start, start + windowSize).map(d => d.value)
          const sim = simulateWindow(prices, initialAmount, monthlyDCA)
          const finalValue = sim[sim.length - 1]!

          if (finalValue < worstFinal) {
            worstFinal = finalValue
            worstWindow = sim
          }
          if (finalValue > bestFinal) {
            bestFinal = finalValue
            bestWindow = sim
          }
        }

        // Current case: last N years
        const currentPrices = data.slice(-windowSize).map(d => d.value)
        const currentWindow = simulateWindow(currentPrices, initialAmount, monthlyDCA)

        // Invested money (linear)
        const invested: number[] = []
        for (let m = 0; m <= months; m++) {
          invested.push(initialAmount + monthlyDCA * m)
        }

        // Labels (Month 0, 1, 2... in years)
        const labels: string[] = []
        for (let m = 0; m <= months; m++) {
          if (m % 12 === 0) {
            labels.push(`Año ${m / 12}`)
          } else {
            labels.push('')
          }
        }

        results.value = {
          labels,
          invested,
          worstCase: worstWindow,
          bestCase: bestWindow,
          currentCase: currentWindow,
        }
      } finally {
        isLoading.value = false
      }
    })
  }

  return {
    loadData,
    calculate,
    isLoading,
    results,
  }
}
