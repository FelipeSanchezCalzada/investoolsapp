<script setup lang="ts">
import { useFrontDB } from '~/db/useFrontDB'
import { Toaster } from '~/components/ui/sonner'
import 'vue-sonner/style.css'

const db = useFrontDB()

onMounted(() => {
  db.initializeDB()
})
</script>

<template>
  <template v-if="db.isInitialized">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </template>
  <Toaster position="top-right" />
</template>
