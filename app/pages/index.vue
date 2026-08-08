<script setup lang="ts">
import { ArrowRightLeft, Database, ShieldCheck, TriangleAlert, Wrench } from '@lucide/vue'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useFrontDB } from '@/db/useFrontDB'
import { PAGE_NAMES } from '~/pages/routeNames'

definePageMeta({
  name: PAGE_NAMES.INDEX,
})

const dbStore = useFrontDB()
const { t } = useI18n()

const tools = computed(() => [
  {
    title: t('tools.portfolioRebalancing.title'),
    description: t('tools.portfolioRebalancing.description'),
    icon: ArrowRightLeft,
    routeName: PAGE_NAMES.HELPERS.PORTFOLIO_REBALANCING,
    category: t('tools.portfolioRebalancing.category'),
  },
])
</script>

<template>
  <div class="flex flex-col gap-10 p-3 sm:p-6 max-w-5xl mx-auto">
    <!-- Beta warning -->
    <Alert class="border-orange-500/50 text-orange-700 dark:text-orange-400 [&>svg]:text-current *:data-[slot=alert-description]:text-orange-700/90 dark:*:data-[slot=alert-description]:text-orange-400/90">
      <TriangleAlert class="size-4" />
      <AlertTitle>{{ $t('home.betaTitle') }}</AlertTitle>
      <AlertDescription>
        {{ $t('home.betaDescription') }}
      </AlertDescription>
    </Alert>

    <!-- Welcome -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        {{ $t('home.welcomeTitle') }}
      </h1>
      <p class="text-muted-foreground mt-2 max-w-2xl">
        {{ $t('home.welcomeSubtitle') }}
      </p>

      <div class="mt-5 grid gap-4 sm:grid-cols-2 max-w-2xl">
        <div class="flex items-start gap-3">
          <div class="flex items-center justify-center size-9 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 shrink-0 mt-0.5">
            <ShieldCheck class="size-4" />
          </div>
          <div>
            <p class="text-sm font-medium">
              {{ $t('home.privacyTitle') }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ $t('home.privacyDescription') }}
            </p>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <div class="flex items-center justify-center size-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
            <Wrench class="size-4" />
          </div>
          <div>
            <p class="text-sm font-medium">
              {{ $t('home.evolvingTitle') }}
            </p>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ $t('home.evolvingDescription') }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <Separator />

    <!-- Workspaces -->
    <div>
      <div class="mb-4">
        <h2 class="text-lg font-semibold">
          {{ $t('home.workspacesTitle') }}
        </h2>
        <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
          {{ $t('home.workspacesDescription') }}
        </p>
      </div>

      <div
        v-if="dbStore.selectedWorkspace"
        class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <button
          v-for="ws in dbStore.workspaces"
          :key="ws.name"
          class="text-left"
          @click="dbStore.selectedWorkspace = ws"
        >
          <Card
            :class="cn(
              'h-full py-0 transition-all cursor-pointer',
              ws.name === dbStore.selectedWorkspace.name
                ? 'border-primary ring-1 ring-primary'
                : 'hover:border-foreground/20 hover:bg-muted/50',
            )"
          >
            <CardContent class="flex items-start gap-3 p-3">
              <div
                :class="cn(
                  'flex items-center justify-center size-9 rounded-lg shrink-0 mt-0.5',
                  ws.name === dbStore.selectedWorkspace.name
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )"
              >
                <Database class="size-4" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-medium text-sm truncate">{{ ws.name }}</span>
                  <Badge
                    v-if="ws.name === dbStore.selectedWorkspace.name"
                    variant="secondary"
                    class="shrink-0 text-xs"
                  >
                    {{ $t('common.active') }}
                  </Badge>
                </div>
                <p
                  v-if="ws.description"
                  class="text-xs text-muted-foreground mt-0.5 truncate"
                >
                  {{ ws.description }}
                </p>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>
    </div>

    <Separator />

    <!-- Tools grid -->
    <div>
      <div class="mb-4">
        <h2 class="text-lg font-semibold">
          {{ $t('home.toolsTitle') }}
        </h2>
        <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
          {{ $t('home.toolsDescription') }}
        </p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="tool in tools"
          :key="tool.title"
          :to="{ name: tool.routeName }"
          class="group"
        >
          <Card class="h-full transition-colors hover:border-foreground/20 hover:bg-muted/50">
            <CardHeader>
              <div class="flex items-start justify-between">
                <div class="flex items-center justify-center size-10 rounded-lg bg-primary/10 text-primary mb-3">
                  <component
                    :is="tool.icon"
                    class="size-5"
                  />
                </div>
                <Badge variant="secondary">
                  {{ tool.category }}
                </Badge>
              </div>
              <CardTitle class="text-base">
                {{ tool.title }}
              </CardTitle>
              <CardDescription>
                {{ tool.description }}
              </CardDescription>
            </CardHeader>
          </Card>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
