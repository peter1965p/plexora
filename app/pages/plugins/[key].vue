<template>
  <div class="page">
    <div v-if="loading" style="padding:60px;text-align:center;color:var(--text-muted);font-size:13px">
      <i class="ti ti-loader-2 spin" style="font-size:20px;display:block;margin-bottom:10px"></i>
      Modul wird geladen …
    </div>
    <div v-else-if="loadError" style="padding:60px;text-align:center;color:#ef4444;font-size:13px">
      <i class="ti ti-alert-circle" style="font-size:20px;display:block;margin-bottom:10px"></i>
      {{ loadError }}
    </div>
    <component v-else :is="resolvedComponent" :host="hostApi" />
  </div>
</template>

<script setup lang="ts">
// Zero-Deploy-Plugin-Loader: lädt das Frontend-Bundle eines Moduls zur Laufzeit
// von einer externen URL (S3) nach — kein Rebuild/Deploy des Kernsystems nötig,
// um ein neues Modul dieser Art live zu schalten.
import * as Vue from 'vue'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const key = route.params.key as string

const loading = ref(true)
const loadError = ref('')
const resolvedComponent = shallowRef<any>(null)

// API, die dem Plugin gereicht wird — es kennt keine Fetch-/Auth-Details selbst.
const hostApi = {
  async getData() {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ data: any }>(useApiUrl(`/api/plugins/${key}/data`), { headers: await useAuthHeader() })
    return res.data
  },
  async saveData(data: any) {
    const { useAuthHeader } = await import('~/composables/useAuth')
    await $fetch(useApiUrl(`/api/plugins/${key}/data`), {
      method: 'POST',
      body: { data },
      headers: await useAuthHeader(),
    })
  },
}

onMounted(async () => {
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const catalog = await $fetch<{ modules: any[] }>(useApiUrl('/api/store/branch-modules'), { headers: await useAuthHeader() })
    const mod = (catalog.modules || []).find((m: any) => m.key === key)
    if (!mod) {
      loadError.value = 'Modul nicht gefunden.'
      return
    }
    if (!mod.remoteEntryUrl) {
      loadError.value = 'Dieses Modul hat kein extern ladbares Bundle hinterlegt.'
      return
    }
    const remote = await import(/* @vite-ignore */ mod.remoteEntryUrl)
    resolvedComponent.value = remote.default(Vue, hostApi)
  } catch (e: any) {
    loadError.value = 'Modul konnte nicht geladen werden: ' + (e?.message || 'Unbekannter Fehler')
  } finally {
    loading.value = false
  }
})
</script>
