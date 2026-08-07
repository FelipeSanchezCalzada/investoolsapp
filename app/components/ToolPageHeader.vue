<script setup lang="ts">
import { Info } from '@lucide/vue'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

defineProps<{
  title: string
}>()
</script>

<template>
  <div class="flex items-center gap-2">
    <h1 class="text-2xl font-bold tracking-tight">
      {{ title }}
    </h1>

    <Popover>
      <PopoverTrigger
        class="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
        aria-label="Qué hace esta herramienta"
      >
        <Info class="size-5" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        class="w-[min(28rem,calc(100vw-2rem))] text-sm leading-relaxed text-muted-foreground"
      >
        <slot />
      </PopoverContent>
    </Popover>
  </div>
</template>
