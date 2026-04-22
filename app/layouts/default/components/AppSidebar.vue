<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar'
import NavMain from './NavMain.vue'
import WorkspaceSwitcher from './WorkspaceSwitcher.vue'

const props = defineProps<SidebarProps>()
</script>

<template>
  <Sidebar
    class="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
    v-bind="props"
  >
    <SidebarHeader>
      <WorkspaceSwitcher />
    </SidebarHeader>
    <SidebarContent>
      <NavMain />
      <!-- <NavSecondary
        class="mt-auto"
      /> -->
    </SidebarContent>
    <SidebarFooter />
  </Sidebar>
</template>
