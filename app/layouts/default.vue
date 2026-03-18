<script lang="ts">
</script>

<script setup lang="ts">
import AppSidebar from './default/components/AppSidebar.vue'
import SiteHeader from './default/components/SiteHeader.vue'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
</script>

<template>
  <div class="[--header-height:calc(--spacing(14))]">
    <SidebarProvider class="flex flex-col">
      <SiteHeader />
      <div class="flex flex-1">
        <AppSidebar />
        <SidebarInset class="min-w-0">
          <div class="m-5 overflow-x-hidden">
            <slot />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  </div>
</template>
