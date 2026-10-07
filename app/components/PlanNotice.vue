<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { PlanNotice } from '~/utils/planNotice'

// Zeigt Hinweise des Servers zu Tarif und Limits ("Dafür brauchst du das Modul …", "Heute sind keine Mails mehr möglich") als Einblendung,
// statt eines roten Fehlers oder stiller Leere. Ausgelöst vom Plugin api-auth.client.ts.
const notice = ref<PlanNotice | null>(null)
let timer: ReturnType<typeof setTimeout> | null = null
const onNotice = (e: Event) => {
  notice.value = (e as CustomEvent<PlanNotice>).detail
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => { notice.value = null }, 12000)
}
onMounted(() => window.addEventListener('plx:notice', onNotice))
onBeforeUnmount(() => { window.removeEventListener('plx:notice', onNotice); if (timer) clearTimeout(timer) })
</script>

<template>
  <div v-if="notice" class="plan-notice" role="alert" :data-kind="notice.kind">
    <span class="pn-text">{{ notice.message }}</span>
    <NuxtLink v-if="notice.link" :to="notice.link.to" class="pn-link" @click="notice = null">{{ notice.link.label }}</NuxtLink>
    <button class="pn-close" type="button" aria-label="Hinweis schließen" @click="notice = null">×</button>
  </div>
</template>

<style scoped>
.plan-notice { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 3000; max-width: min(640px, calc(100vw - 32px)); display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 10px; background: var(--bg-card, #fff); color: var(--text, #1f2937); border: 1px solid var(--border, #e5e7eb); border-left: 4px solid #f59e0b; box-shadow: 0 8px 28px rgba(0,0,0,.18); font-size: 13px; line-height: 1.45; }
.plan-notice[data-kind="plan"] { border-left-color: var(--accent, #6366f1); }
.pn-link { color: var(--accent, #6366f1); font-weight: 600; white-space: nowrap; text-decoration: none; }
.pn-close { background: none; border: none; font-size: 20px; line-height: 1; cursor: pointer; color: var(--text-muted, #6b7280); padding: 0 2px; }
</style>
