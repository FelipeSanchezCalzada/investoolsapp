<script setup lang="ts">
import { useFrontDB } from '~/db/useFrontDB'

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
</template>
