<template>
  <div>
    <div class="agb-content" v-html="agbHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
definePageMeta({ layout: 'lp' })

const { data } = await useFetch(useApiUrl('/api/settings/agb'))
const agb = computed(() => (data.value as any)?.agb)
const agbHtml = computed(() => marked.parse(agb.value?.content || ''))
</script>

<style scoped>
.agb-content { font-size: 14px; line-height: 1.9; color: #8b8fa8; }
.agb-content :deep(h1) { font-family: "Space Grotesk", sans-serif; font-size: 36px; font-weight: 800; color: #f0eef9; margin: 0 0 8px; letter-spacing: -0.5px; }
.agb-content :deep(h2) { font-family: "Space Grotesk", sans-serif; font-size: 18px; font-weight: 700; color: #f0eef9; margin: 32px 0 12px; }
.agb-content :deep(h3) { font-family: "Space Grotesk", sans-serif; font-size: 15px; font-weight: 600; color: #c4c2d4; margin: 20px 0 8px; }
.agb-content :deep(p) { margin: 0 0 12px; }
.agb-content :deep(strong) { color: #f0eef9; font-weight: 600; }
.agb-content :deep(em) { color: #c4c2d4; font-style: italic; }
.agb-content :deep(a) { color: #ea580c; text-decoration: none; }
.agb-content :deep(a:hover) { text-decoration: underline; }
.agb-content :deep(ul), .agb-content :deep(ol) { padding-left: 20px; margin: 0 0 12px; }
.agb-content :deep(li) { margin-bottom: 4px; }
.agb-content :deep(hr) { border: none; border-top: 0.5px solid rgba(255,255,255,0.08); margin: 24px 0; }
</style>
