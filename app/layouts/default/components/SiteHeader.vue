<script setup lang="ts">
import { SidebarIcon } from '@lucide/vue'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSidebar } from '@/components/ui/sidebar'
import type { BreadcrumbItem as BreadcrumbItemType } from '~/types/page-meta'

const { toggleSidebar } = useSidebar()
const route = useRoute()

const breadcrumbs = computed(() => (route.meta.breadcrumb ?? []) as BreadcrumbItemType[])
</script>

<template>
  <header class="bg-background sticky top-0 z-50 flex w-full items-center border-b">
    <div class="flex h-(--header-height) w-full items-center gap-2 px-4">
      <Button
        class="h-8 w-8"
        variant="ghost"
        size="icon"
        @click="toggleSidebar"
      >
        <SidebarIcon />
      </Button>
      <Separator
        orientation="vertical"
        class="mr-2 h-4"
      />
      <Breadcrumb
        v-if="breadcrumbs.length > 0"
        class="hidden sm:block"
      >
        <BreadcrumbList>
          <template
            v-for="(crumb, index) in breadcrumbs"
            :key="index"
          >
            <BreadcrumbSeparator v-if="index > 0" />
            <BreadcrumbItem>
              <BreadcrumbLink
                v-if="crumb.to"
                asChild
              >
                <NuxtLink :to="crumb.to">
                  {{ crumb.label }}
                </NuxtLink>
              </BreadcrumbLink>
              <BreadcrumbPage v-else>
                {{ crumb.label }}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </template>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  </header>
</template>
