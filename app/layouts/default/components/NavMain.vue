<script setup lang="ts">
import { Calculator, ChevronRight, Toolbox } from '@lucide/vue'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import { PAGE_NAMES } from '~/pages/routeNames'

const menuItems = computed(() => {
  return [{
    title: 'Ayudantes',
    icon: Toolbox,
    isActive: true,
    items: [
      {
        title: 'Rebalanceo de fondos',
        routeName: PAGE_NAMES.HELPERS.PORTFOLIO_REBALANCING,
      },
    ],
  }, {
    title: 'Calculadoras',
    icon: Calculator,
    isActive: true,
    items: [
      {
        title: 'Calculadora S&P 500',
        routeName: PAGE_NAMES.CALCULATORS.SP500,
      },
      {
        title: 'Libertad Financiera',
        routeName: PAGE_NAMES.CALCULATORS.FINANCIAL_FREEDOM,
      },
    ],
  }]
})
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>Herramientas</SidebarGroupLabel>
    <SidebarMenu>
      <Collapsible
        v-for="item in menuItems"
        :key="item.title"
        v-slot="{ open }"
        asChild
        :defaultOpen="item.isActive"
      >
        <SidebarMenuItem>
          <template v-if="item.items?.length">
            <CollapsibleTrigger asChild>
              <SidebarMenuButton :tooltip="item.title">
                <component :is="item.icon" />
                <span>{{ item.title }}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </template>
          <SidebarMenuButton
            v-else
            asChild
            :tooltip="item.title"
          >
            <!-- <a :href="item.url">
              <component :is="item.icon" />
              <span>{{ item.title }}</span>
            </a> -->
          </SidebarMenuButton>
          <template v-if="item.items?.length">
            <SidebarMenuAction
              class="hover:bg-transparent! hover:text-sidebar-foreground! !peer-hover/menu-button:text-sidebar-foreground"
            >
              <ChevronRight :class="open ? 'rotate-90' : ''" />
              <span class="sr-only">Toggle</span>
            </SidebarMenuAction>
            <CollapsibleContent>
              <SidebarMenuSub>
                <SidebarMenuSubItem
                  v-for="subItem in item.items"
                  :key="subItem.title"
                >
                  <SidebarMenuSubButton
                    asChild
                    :class="{ 'font-semibold text-sidebar-foreground': $route.name === subItem.routeName }"
                  >
                    <NuxtLink :to="{ name: subItem.routeName }">
                      <span>{{ subItem.title }}</span>
                    </NuxtLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </CollapsibleContent>
          </template>
        </SidebarMenuItem>
      </Collapsible>
    </SidebarMenu>
  </SidebarGroup>
</template>
