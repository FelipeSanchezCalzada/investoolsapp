<script setup lang="ts">
import { ArrowRightLeft, Database } from 'lucide-vue-next'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useFrontDB } from '@/db/useFrontDB'
import { PAGE_NAMES } from '~/pages/routeNames'

definePageMeta({
  name: PAGE_NAMES.INDEX,
})

const dbStore = useFrontDB()

const tools = computed(() => [
  {
    title: 'Rebalanceo de Cartera',
    description: 'Calcula los traspasos necesarios para rebalancear tu cartera de fondos hacia la distribución objetivo que definas.',
    icon: ArrowRightLeft,
    routeName: PAGE_NAMES.HELPERS.PORTFOLIO_REBALANCING,
    category: 'Ayudantes',
  },
])
</script>

<template>
  <div class="flex flex-col gap-10 p-3 sm:p-6 max-w-5xl mx-auto">
    <!-- Welcome -->
    <div>
      <h1 class="text-2xl font-bold tracking-tight">
        Bienvenido a Investools
      </h1>
      <p class="text-muted-foreground mt-2 max-w-2xl">
        Tu caja de herramientas para gestionar inversiones. Desde aquí puedes acceder a todas las utilidades disponibles y gestionar tus espacios de trabajo.
      </p>
    </div>

    <Separator />

    <!-- Workspaces -->
    <div>
      <div class="mb-4">
        <h2 class="text-lg font-semibold">
          Tus workspaces
        </h2>
        <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
          Cada workspace funciona como una base de datos independiente dentro de la app. Puedes crear varios para separar carteras, estrategias o simulaciones, y cambiar entre ellos en cualquier momento.
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
                    Activo
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
          Herramientas
        </h2>
        <p class="text-sm text-muted-foreground mt-1 max-w-2xl">
          Accede a las utilidades disponibles para analizar y gestionar tus inversiones. Se irán añadiendo nuevas herramientas con el tiempo.
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
