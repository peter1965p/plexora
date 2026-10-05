<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useAppStore } from '~/stores/app'

const store = useAppStore()
const route = useRoute()
onMounted(() => store.loadTheme())
// Nach dem Login (ohne Seiten-Neuladen) das Theme des Nutzers nachladen
watch(() => route.path, () => { if (import.meta.client) store.loadTheme() })
</script>
