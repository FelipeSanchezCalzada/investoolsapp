<script setup lang="ts">
import type { SidebarProps } from '@/components/ui/sidebar'
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  Toolbox,
} from 'lucide-vue-next'
import NavMain from './NavMain.vue'
import NavSecondary from './NavSecondary.vue'
import WorkspaceSwitcher from './WorkspaceSwitcher.vue'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar'

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
