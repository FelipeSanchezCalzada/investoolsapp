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
    <SidebarProvider
      class="flex flex-col"
      :style="{ '--sidebar-width': '16.2rem' }"
    >
      <SiteHeader />
      <div class="flex flex-1">
        <AppSidebar />
        <SidebarInset class="min-w-0">
          <div class="min-w-0 flex-1">
            <slot />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
    <footer class="border-t border-border/40 py-4 px-6 text-center text-xs text-muted-foreground/60">
      <div class="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-4">
        <span>
          {{ $t('layout.footer.madeWith') }} <Heart class="inline-block size-3.5 text-red-500 fill-red-500" /> {{ $t('layout.footer.by') }}
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
        <span>{{ $t('layout.footer.license') }}</span>
      </div>
      <p class="mx-auto mt-2 max-w-2xl text-[0.7rem] leading-relaxed text-muted-foreground/50">
        {{ $t('layout.footer.privacy') }}
      </p>
    </footer>
  </div>
</template>
