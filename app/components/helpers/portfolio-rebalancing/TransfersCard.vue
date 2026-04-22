<script setup lang="ts">
import { ArrowRightLeft, TrendingUp, TrendingDown, Copy, Check, ChevronDown, ChevronRight } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import type { Workspace } from '~/db/types'
import useFrontDB from '~/db/useFrontDB'

type PortfolioRebalancingHelper = NonNullable<Workspace['portfolioRebalancingHelper']>
type Transfer = PortfolioRebalancingHelper['dcaTransfers'][number][number]

const { selectedWorkspace } = storeToRefs(useFrontDB())

const dcaTransfers = computed(() =>
  selectedWorkspace.value?.portfolioRebalancingHelper?.dcaTransfers ?? [],
)

const hasCalculated = computed(() => dcaTransfers.value.length > 0)

const collapsedParts = ref<Set<number>>(new Set())

watchImmediate(selectedWorkspace, () => {
  collapsedParts.value = new Set()
})

function togglePartCollapsed(partIndex: number) {
  if (collapsedParts.value.has(partIndex)) {
    collapsedParts.value.delete(partIndex)
  } else {
    collapsedParts.value.add(partIndex)
  }
}

function isPartComplete(part: Transfer[]): boolean {
  return part.length > 0 && part.every(t => t.done)
}

function partProgress(part: Transfer[]): { done: number, total: number } {
  return { done: part.filter(t => t.done).length, total: part.length }
}

const globalProgress = computed(() => {
  const all = dcaTransfers.value.flat()
  if (all.length === 0) return { done: 0, total: 0, percent: 0 }
  const done = all.filter(t => t.done).length
  return { done, total: all.length, percent: Math.round((done / all.length) * 100) }
})

const copiedKey = ref<string | null>(null)

function copyIsin(isin: string, key: string) {
  navigator.clipboard.writeText(isin)
  copiedKey.value = key
  setTimeout(() => {
    if (copiedKey.value === key) copiedKey.value = null
  }, 1500)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}
</script>

<template>
  <Card v-if="hasCalculated">
    <CardHeader>
      <CardTitle>Traspasos necesarios</CardTitle>
      <CardDescription>
        {{ dcaTransfers.length === 0
          ? 'Tu cartera ya está balanceada. No se necesitan traspasos.'
          : dcaTransfers.length === 1
            ? `Se necesitan ${dcaTransfers[0]!.length} traspaso${dcaTransfers[0]!.length > 1 ? 's' : ''} para rebalancear tu cartera.`
            : `Se necesitan ${dcaTransfers[0]!.length} traspaso${dcaTransfers[0]!.length > 1 ? 's' : ''} divididos en ${dcaTransfers.length} partes (DCA).`
        }}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <!-- Progress bar -->
      <div
        v-if="globalProgress.total > 0"
        class="mb-5"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium">
            Progreso
          </span>
          <span class="text-sm tabular-nums text-muted-foreground">
            {{ globalProgress.done }} de {{ globalProgress.total }} completados
          </span>
        </div>
        <Progress
          :modelValue="globalProgress.percent"
          class="h-2"
        />
      </div>

      <div
        v-if="dcaTransfers.length > 0"
        class="flex flex-col gap-4"
      >
        <!-- Single part: no grouping header -->
        <template v-if="dcaTransfers.length === 1">
          <div class="flex flex-col gap-3">
            <div
              v-for="(transfer, tIndex) in dcaTransfers[0]"
              :key="tIndex"
              :class="cn(
                'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all duration-200',
                transfer.done
                  ? 'bg-muted/10 border-muted text-muted-foreground/50'
                  : 'bg-muted/30',
              )"
            >
              <div class="flex items-center gap-3 sm:gap-4">
                <Checkbox
                  v-model="transfer.done"
                  class="size-5 shrink-0"
                />
                <div
                  :class="cn(
                    'flex items-center justify-center size-8 rounded-full text-sm font-semibold shrink-0',
                    transfer.done
                      ? 'bg-muted/30 text-muted-foreground/50'
                      : 'bg-primary/10 text-primary',
                  )"
                >
                  {{ tIndex + 1 }}
                </div>
                <span :class="cn('text-lg font-semibold tabular-nums sm:hidden', transfer.done && 'text-muted-foreground/50')">
                  {{ formatCurrency(transfer.amount) }}
                </span>
              </div>

              <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 pl-11 sm:pl-0">
                <div class="flex items-center gap-2 min-w-0 sm:flex-1">
                  <Badge
                    :variant="transfer.done ? undefined : 'destructive'"
                    :class="cn('shrink-0', transfer.done && 'bg-muted text-muted-foreground/60 hover:bg-muted')"
                  >
                    <TrendingDown class="size-3 mr-1" />
                    Origen
                  </Badge>
                  <div class="flex flex-col min-w-0">
                    <span :class="cn('text-sm font-medium truncate', transfer.done && 'text-muted-foreground/50')">{{ transfer.fromName }}</span>
                    <span class="inline-flex items-center gap-1">
                      <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')">{{ transfer.fromIsin }}</span>
                      <button
                        class="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/10 transition-colors"
                        @click="copyIsin(transfer.fromIsin, `0-${tIndex}-from`)"
                      >
                        <Check
                          v-if="copiedKey === `0-${tIndex}-from`"
                          class="size-3 text-green-500"
                        />
                        <Copy
                          v-else
                          :class="cn('size-3', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')"
                        />
                      </button>
                    </span>
                  </div>
                </div>

                <ArrowRightLeft :class="cn('size-4 shrink-0 hidden sm:block', transfer.done ? 'text-muted-foreground/30' : 'text-muted-foreground')" />

                <div class="flex items-center gap-2 min-w-0 sm:flex-1">
                  <Badge
                    :class="cn('shrink-0', transfer.done ? 'bg-muted text-muted-foreground/60 hover:bg-muted' : 'bg-green-800 text-white hover:bg-green-800/80')"
                  >
                    <TrendingUp class="size-3 mr-1" />
                    Destino
                  </Badge>
                  <div class="flex flex-col min-w-0">
                    <span :class="cn('text-sm font-medium truncate', transfer.done ? 'text-muted-foreground/50' : 'text-green-800 dark:text-green-400')">{{ transfer.toName }}</span>
                    <span class="inline-flex items-center gap-1">
                      <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-green-700/70 dark:text-green-500/70')">{{ transfer.toIsin }}</span>
                      <button
                        class="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/10 transition-colors"
                        @click="copyIsin(transfer.toIsin, `0-${tIndex}-to`)"
                      >
                        <Check
                          v-if="copiedKey === `0-${tIndex}-to`"
                          class="size-3 text-green-500"
                        />
                        <Copy
                          v-else
                          :class="cn('size-3', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')"
                        />
                      </button>
                    </span>
                  </div>
                </div>
              </div>

              <div class="text-right shrink-0 hidden sm:block">
                <span :class="cn('text-lg font-semibold tabular-nums', transfer.done && 'text-muted-foreground/50')">
                  {{ formatCurrency(transfer.amount) }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- Multiple DCA parts: collapsible groups -->
        <template v-else>
          <div
            v-for="(part, partIndex) in dcaTransfers"
            :key="partIndex"
            class="flex flex-col gap-0 rounded-lg border overflow-hidden"
          >
            <!-- Part header (clickable to collapse) -->
            <button
              class="flex flex-col gap-2 p-4 pb-3 w-full text-left hover:bg-muted/50 transition-colors"
              @click="togglePartCollapsed(partIndex)"
            >
              <div class="flex items-center gap-3 w-full">
                <component
                  :is="collapsedParts.has(partIndex) ? ChevronRight : ChevronDown"
                  class="size-4 shrink-0 text-muted-foreground"
                />
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <span class="font-semibold">
                    Parte {{ partIndex + 1 }} de {{ dcaTransfers.length }}
                  </span>
                  <Badge
                    v-if="isPartComplete(part)"
                    class="bg-green-800 text-white hover:bg-green-800/80"
                  >
                    <Check class="size-3 mr-1" />
                    Completada
                  </Badge>
                  <Badge
                    v-else
                    variant="secondary"
                  >
                    {{ partProgress(part).done }}/{{ partProgress(part).total }}
                  </Badge>
                </div>
                <span class="text-sm font-medium tabular-nums text-muted-foreground">
                  {{ formatCurrency(part.reduce((sum, t) => sum + t.amount, 0)) }}
                </span>
              </div>
              <Progress
                :modelValue="partProgress(part).total > 0 ? Math.round((partProgress(part).done / partProgress(part).total) * 100) : 0"
                class="h-1.5"
              />
            </button>

            <!-- Part transfers -->
            <div
              v-if="!collapsedParts.has(partIndex)"
              class="flex flex-col gap-3 mt-2 p-3 sm:p-4 pt-0 sm:pt-0"
            >
              <div
                v-for="(transfer, tIndex) in part"
                :key="tIndex"
                :class="cn(
                  'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-all duration-200',
                  transfer.done
                    ? 'bg-muted/10 border-muted text-muted-foreground/50'
                    : 'bg-muted/30',
                )"
              >
                <div class="flex items-center gap-3 sm:gap-4">
                  <Checkbox
                    v-model="transfer.done"
                    class="size-5 shrink-0"
                  />
                  <div
                    :class="cn(
                      'flex items-center justify-center size-8 rounded-full text-sm font-semibold shrink-0',
                      transfer.done
                        ? 'bg-muted/30 text-muted-foreground/50'
                        : 'bg-primary/10 text-primary',
                    )"
                  >
                    {{ tIndex + 1 }}
                  </div>
                  <span :class="cn('text-lg font-semibold tabular-nums sm:hidden', transfer.done && 'text-muted-foreground/50')">
                    {{ formatCurrency(transfer.amount) }}
                  </span>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 pl-11 sm:pl-0">
                  <div class="flex items-center gap-2 min-w-0 sm:flex-1">
                    <Badge
                      :variant="transfer.done ? undefined : 'destructive'"
                      :class="cn('shrink-0', transfer.done && 'bg-muted text-muted-foreground/60 hover:bg-muted')"
                    >
                      <TrendingDown class="size-3 mr-1" />
                      Origen
                    </Badge>
                    <div class="flex flex-col min-w-0">
                      <span :class="cn('text-sm font-medium truncate', transfer.done && 'text-muted-foreground/50')">{{ transfer.fromName }}</span>
                      <span class="inline-flex items-center gap-1">
                        <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')">{{ transfer.fromIsin }}</span>
                        <button
                          class="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/10 transition-colors"
                          @click.stop="copyIsin(transfer.fromIsin, `${partIndex}-${tIndex}-from`)"
                        >
                          <Check
                            v-if="copiedKey === `${partIndex}-${tIndex}-from`"
                            class="size-3 text-green-500"
                          />
                          <Copy
                            v-else
                            :class="cn('size-3', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')"
                          />
                        </button>
                      </span>
                    </div>
                  </div>

                  <ArrowRightLeft :class="cn('size-4 shrink-0 hidden sm:block', transfer.done ? 'text-muted-foreground/30' : 'text-muted-foreground')" />

                  <div class="flex items-center gap-2 min-w-0 sm:flex-1">
                    <Badge
                      :class="cn('shrink-0', transfer.done ? 'bg-muted text-muted-foreground/60 hover:bg-muted' : 'bg-green-800 text-white hover:bg-green-800/80')"
                    >
                      <TrendingUp class="size-3 mr-1" />
                      Destino
                    </Badge>
                    <div class="flex flex-col min-w-0">
                      <span :class="cn('text-sm font-medium truncate', transfer.done ? 'text-muted-foreground/50' : 'text-green-800 dark:text-green-400')">{{ transfer.toName }}</span>
                      <span class="inline-flex items-center gap-1">
                        <span :class="cn('text-xs font-mono', transfer.done ? 'text-muted-foreground/40' : 'text-green-700/70 dark:text-green-500/70')">{{ transfer.toIsin }}</span>
                        <button
                          class="inline-flex items-center justify-center size-4 rounded hover:bg-muted-foreground/10 transition-colors"
                          @click.stop="copyIsin(transfer.toIsin, `${partIndex}-${tIndex}-to`)"
                        >
                          <Check
                            v-if="copiedKey === `${partIndex}-${tIndex}-to`"
                            class="size-3 text-green-500"
                          />
                          <Copy
                            v-else
                            :class="cn('size-3', transfer.done ? 'text-muted-foreground/40' : 'text-muted-foreground')"
                          />
                        </button>
                      </span>
                    </div>
                  </div>
                </div>

                <div class="text-right shrink-0 hidden sm:block">
                  <span :class="cn('text-lg font-semibold tabular-nums', transfer.done && 'text-muted-foreground/50')">
                    {{ formatCurrency(transfer.amount) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div
        v-else
        class="flex flex-col items-center justify-center py-8 text-muted-foreground"
      >
        <ArrowRightLeft class="size-8 mb-2" />
        <p class="text-sm">
          No se necesitan traspasos.
        </p>
      </div>
    </CardContent>
  </Card>
</template>
