<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { NumberFieldInput } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <NumberFieldInput
    data-slot="input"
    :class="cn(
      'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none md:text-sm',
      'dark:bg-input/30 placeholder:text-muted-foreground',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'disabled:cursor-not-allowed disabled:opacity-50',
      props.class,
    )"
  />
</template>
