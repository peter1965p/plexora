<template>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0e1a;color:#fff;font-family:system-ui,sans-serif">
    <div v-if="error" style="text-align:center;padding:24px">
      <i class="ti ti-link-off" style="font-size:32px;opacity:.5;display:block;margin-bottom:12px"></i>
      <p style="font-size:14px;color:rgba(255,255,255,0.6)">Dieser Link ist nicht verfügbar.</p>
    </div>
    <i v-else class="ti ti-loader-2 spin" style="font-size:28px;opacity:.6"></i>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const code  = route.params.code as string
const error = ref(false)

onMounted(async () => {
  try {
    const res = await $fetch<{ targetUrl: string }>(useApiUrl(`/api/public/s/${code}`))
    if (res?.targetUrl) { window.location.replace(res.targetUrl); return }
    error.value = true
  } catch {
    error.value = true
  }
})
</script>
