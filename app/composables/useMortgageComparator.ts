import useFrontDB from '~/db/useFrontDB'
import type { Mortgage, MortgageBinding, MortgageRateType } from '~/db/types/FrontDBv3'
import { calculateComparison, type MortgageComparisonResult, type MortgageResult } from '~/lib/mortgage/calculate'
import {
  colorForIndex,
  createDefaultComparator,
  createDefaultEarlyRepaymentFees,
  createExampleMortgages,
  createMortgage,
  createSeedScenarios,
  SCENARIO_IDS,
} from '~/lib/mortgage/templates'

/** Id of the always-last comparison tab. */
export const COMPARISON_TAB_ID = '__comparison__'

export const currencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const compactCurrencyFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

const percentFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/d'
  return currencyFormatter.format(value)
}

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/d'
  return compactCurrencyFormatter.format(value)
}

export function formatPercent(value: number | null | undefined, suffix = ' %'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/d'
  return `${percentFormatter.format(value)}${suffix}`
}

export function formatPp(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/d'
  return `${percentFormatter.format(value)} pp`
}

const isLoading = ref(false)
const comparison = ref<MortgageComparisonResult | null>(null)
/** Ephemeral UI state on purpose: the active tab is not persisted */
const activeTabId = ref<string>(COMPARISON_TAB_ID)

export function useMortgageComparator() {
  const { selectedWorkspace } = storeToRefs(useFrontDB())

  watchImmediate(selectedWorkspace, (workspace) => {
    if (workspace && !workspace.mortgageComparator) {
      workspace.mortgageComparator = createDefaultComparator()
    }
  })

  const comparator = computed(() => selectedWorkspace.value?.mortgageComparator ?? null)
  const common = computed(() => comparator.value?.common ?? null)
  const mortgages = computed(() => comparator.value?.mortgages ?? [])
  const scenarios = computed(() => comparator.value?.scenarios ?? [])

  const selectedScenario = computed(() =>
    scenarios.value.find(scenario => scenario.id === comparator.value?.selectedScenarioId) ?? null,
  )

  function calculate() {
    const current = comparator.value
    if (!current) return

    isLoading.value = true
    const snapshot = JSON.parse(JSON.stringify(current)) as typeof current

    requestAnimationFrame(() => {
      try {
        comparison.value = calculateComparison(snapshot)
      } finally {
        isLoading.value = false
      }
    })
  }

  watch(
    () => (comparator.value ? JSON.stringify(comparator.value) : null),
    (value) => {
      if (!value) return
      calculate()
    },
    { immediate: true },
  )

  // Re-seed the predefined scenarios when the Euribor changes, unless the user edited them
  watch(
    () => common.value?.currentIndexPct,
    (currentIndexPct, previousIndexPct) => {
      const current = comparator.value
      if (!current || currentIndexPct === undefined || previousIndexPct === undefined) return

      const previousSeeds = createSeedScenarios(previousIndexPct)
      const nextSeeds = createSeedScenarios(currentIndexPct)

      for (const seed of nextSeeds) {
        if (seed.id === SCENARIO_IDS.CUSTOM) continue
        const index = current.scenarios.findIndex(scenario => scenario.id === seed.id)
        if (index === -1) continue
        const previousSeed = previousSeeds.find(scenario => scenario.id === seed.id)
        const untouched = JSON.stringify(current.scenarios[index]!.points) === JSON.stringify(previousSeed?.points)
        if (untouched) current.scenarios[index]!.points = seed.points
      }
    },
  )

  const results = computed(() => comparison.value?.results ?? [])

  function resultFor(mortgageId: string): MortgageResult | null {
    return results.value.find(result => result.mortgage.id === mortgageId) ?? null
  }

  function tabExists(id: string): boolean {
    if (id === COMPARISON_TAB_ID) return mortgages.value.length > 0
    return mortgages.value.some(mortgage => mortgage.id === id)
  }

  // Default tab: the comparison once there are two offers, the single mortgage otherwise
  watchImmediate(() => mortgages.value.map(mortgage => mortgage.id).join(','), () => {
    if (tabExists(activeTabId.value)) return
    if (mortgages.value.length >= 2) activeTabId.value = COMPARISON_TAB_ID
    else if (mortgages.value.length === 1) activeTabId.value = mortgages.value[0]!.id
    else activeTabId.value = COMPARISON_TAB_ID
  })

  function addMortgage(rateType: MortgageRateType = 'fixed'): Mortgage | null {
    const current = comparator.value
    if (!current) return null
    const mortgage = createMortgage(current.mortgages.length, rateType)
    current.mortgages.push(mortgage)
    activeTabId.value = mortgage.id
    return mortgage
  }

  function loadExamples() {
    const current = comparator.value
    if (!current) return
    const examples = createExampleMortgages()
    current.mortgages.push(...examples)
    current.mortgages.forEach((mortgage, index) => {
      mortgage.color = colorForIndex(index)
    })
    activeTabId.value = COMPARISON_TAB_ID
  }

  function removeMortgage(mortgageId: string) {
    const current = comparator.value
    if (!current) return
    const index = current.mortgages.findIndex(mortgage => mortgage.id === mortgageId)
    if (index === -1) return
    current.mortgages.splice(index, 1)
    if (activeTabId.value === mortgageId) {
      activeTabId.value = current.mortgages[Math.max(0, index - 1)]?.id ?? COMPARISON_TAB_ID
    }
  }

  function duplicateMortgage(mortgageId: string) {
    const current = comparator.value
    if (!current) return
    const source = current.mortgages.find(mortgage => mortgage.id === mortgageId)
    if (!source) return

    const copy = JSON.parse(JSON.stringify(source)) as Mortgage
    copy.id = crypto.randomUUID()
    copy.name = `${source.name} (copia)`
    copy.color = colorForIndex(current.mortgages.length)
    copy.bindings = copy.bindings.map(binding => ({ ...binding, id: crypto.randomUUID() }))
    copy.prepayments = copy.prepayments.map(prepayment => ({ ...prepayment, id: crypto.randomUUID() }))

    current.mortgages.push(copy)
    activeTabId.value = copy.id
  }

  function findMortgage(mortgageId: string): Mortgage | null {
    return comparator.value?.mortgages.find(mortgage => mortgage.id === mortgageId) ?? null
  }

  /** Reloads the legal fee tiers when the rate type changes. */
  function applyRateTypeDefaults(mortgage: Mortgage) {
    mortgage.earlyRepaymentFees = createDefaultEarlyRepaymentFees(mortgage.rateType)
  }

  function addBinding(mortgageId: string, binding: MortgageBinding) {
    findMortgage(mortgageId)?.bindings.push(binding)
  }

  function removeBinding(mortgageId: string, bindingId: string) {
    const mortgage = findMortgage(mortgageId)
    if (!mortgage) return
    const index = mortgage.bindings.findIndex(binding => binding.id === bindingId)
    if (index !== -1) mortgage.bindings.splice(index, 1)
  }

  return {
    isLoading,
    comparator,
    common,
    mortgages,
    scenarios,
    selectedScenario,
    comparison,
    results,
    activeTabId,
    resultFor,
    addMortgage,
    loadExamples,
    removeMortgage,
    duplicateMortgage,
    findMortgage,
    applyRateTypeDefaults,
    addBinding,
    removeBinding,
  }
}
