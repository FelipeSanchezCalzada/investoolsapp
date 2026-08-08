<script setup lang="ts">
import { Languages } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// `no_prefix` strategy: the locale is not part of the URL, so it is switched imperatively.
const { locale, locales, setLocale, t } = useI18n()
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        class="h-8 w-8"
        :aria-label="t('locale.label')"
      >
        <Languages class="size-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem
        v-for="item in locales"
        :key="item.code"
        :class="{ 'font-semibold': item.code === locale }"
        @select="setLocale(item.code)"
      >
        {{ item.name ?? item.code }}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
