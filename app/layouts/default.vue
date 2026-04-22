<script lang="ts">
</script>

<script setup lang="ts">
import AppSidebar from './default/components/AppSidebar.vue'
import SiteHeader from './default/components/SiteHeader.vue'
import { Heart } from '@lucide/vue'
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
    <footer class="border-t border-border/40 py-4 px-6 text-center text-xs text-muted-foreground/60">
      <div class="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-4">
        <span>
          Made with <Heart class="inline-block size-3.5 text-red-500 fill-red-500" /> by
          <a
            href="https://github.com/FelipeSanchezCalzada"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-4 hover:text-foreground transition-colors"
          >Felipe Sanchez</a>
        </span>
        <span class="hidden sm:inline">&middot;</span>
        <a
          href="https://github.com/FelipeSanchezCalzada/investoolsapp"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-4 hover:text-foreground transition-colors"
        >GitHub</a>
        <span class="hidden sm:inline">&middot;</span>
        <span>AGPL-3.0 License</span>
      </div>
    </footer>
  </div>
</template>
