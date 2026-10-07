<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'

// "Heute verbraucht": Tarif, Mail-Kontingent und Upload-Grenzen des eigenen Mandanten (GET /api/plan).
const data = ref<any>(null)
const failed = ref(false)
const mb = (n: number) => (n >= 1048576 ? `${Math.round(n / 1048576)} MB` : `${Math.round(n / 1024)} KB`)
const pct = (used: number, max: number) => (max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0)
const rows = computed(() => !data.value ? [] : [
  { label: 'Systemmails heute (Rechnungen, Bestätigungen, Einladungen)', used: data.value.usage.system, max: data.value.limits.mailSystemPerDay },
  { label: 'Massenmails heute (Kampagnen, Newsletter, Follow-ups)', used: data.value.usage.bulk, max: data.value.limits.mailBulkPerDay },
])
onMounted(async () => {
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    data.value = await $fetch(useApiUrl('/api/plan'), { headers: await useAuthHeader() })
  } catch { failed.value = true }
})
</script>

<template>
  <div v-if="data && !data.exempt" class="card">
    <div class="card-header">
      <span class="card-title"><i class="ti ti-gauge" style="margin-right:8px;color:var(--accent)"></i>Dein Tarif: {{ data.label }}</span>
      <span v-if="!data.enforced" style="font-size:11px;color:var(--text-muted)">Limits werden noch nicht durchgesetzt (Testphase)</span>
    </div>
    <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
      <div v-for="r in rows" :key="r.label">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <span>{{ r.label }}</span><strong>{{ r.used }} von {{ r.max }}</strong>
        </div>
        <div style="height:6px;border-radius:4px;background:var(--border,#e5e7eb);overflow:hidden">
          <div :style="{ width: pct(r.used, r.max) + '%', height: '100%', background: pct(r.used, r.max) >= 90 ? '#E05C5C' : 'var(--accent)' }"></div>
        </div>
      </div>
      <div style="font-size:12px;color:var(--text-muted)">
        Uploads: Dateien bis {{ mb(data.limits.uploadMaxBytes) }}, höchstens {{ data.limits.uploadsPerDay }} pro Tag.
        <template v-if="data.limits.records"> Ohne Lizenz sind bis zu {{ data.limits.records.crm }} CRM-Einträge, {{ data.limits.records.projects }} Projekte und {{ data.limits.records.support }} Tickets möglich.</template>
        <NuxtLink v-if="data.plan === 'free'" to="/store" style="color:var(--accent);margin-left:6px">Lizenz im Modul-Store</NuxtLink>
      </div>
    </div>
  </div>
</template>
