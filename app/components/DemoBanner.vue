<template>
  <div v-if="show" class="demo-banner" role="status">
    <i class="ti ti-flask"></i>
    <span><strong>{{ tr('Demo-Modus:') }}</strong> {{ tr('Probiere alles aus. Beim Abmelden wird alles auf den Standard zurückgesetzt. Gesperrt sind E-Mail-Versand, Uploads, KI, Zahlungs- und Sicherheitseinstellungen sowie Blog, Lead-Seiten und Website.') }}</span>
    <button class="demo-banner-x" :title="tr('Ausblenden')" :aria-label="tr('Ausblenden')" @click="hide"><i class="ti ti-x"></i></button>
  </div>
</template>

<script setup lang="ts">
import { isDemoEmail } from '~~/shared/demo'
const show = ref(false)
onMounted(async () => {
  try {
    const { useAuthUser } = await import('~/composables/useAuth')
    const u = await useAuthUser()
    if (isDemoEmail(u.email) && sessionStorage.getItem('plx-demo-banner') !== '0') show.value = true
  } catch { /* ohne Banner weiter */ }
})
const hide = () => { show.value = false; try { sessionStorage.setItem('plx-demo-banner', '0') } catch { /* egal */ } }
</script>

<style scoped>
.demo-banner { display: flex; align-items: center; gap: 10px; padding: 8px 16px; font-size: 12px; line-height: 1.4; background: rgba(var(--accent-rgb), 0.12); color: var(--text-primary); border-bottom: 0.5px solid var(--border-accent, var(--border)) }
.demo-banner i { color: var(--accent); font-size: 16px }
.demo-banner span { flex: 1 }
.demo-banner-x { background: none; border: 0; cursor: pointer; color: var(--text-muted); font-size: 14px }
</style>
