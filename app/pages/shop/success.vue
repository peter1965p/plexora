<template>
  <div style="min-height:100vh;background:var(--bg-base);display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="text-align:center;max-width:480px">
      <div style="width:80px;height:80px;background:rgba(0,212,180,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px">
        <i class="ti ti-circle-check" style="font-size:40px;color:#00D4B4"></i>
      </div>
      <h1 style="font-size:28px;font-weight:900;margin:0 0 12px">Zahlung erfolgreich! 🎉</h1>
      <p style="color:var(--text-muted);line-height:1.6;margin:0 0 32px">
        Vielen Dank für deinen Kauf! Du erhältst in Kürze eine Bestätigungs-E-Mail mit weiteren Informationen.
      </p>
      <NuxtLink to="/shop">
        <button class="accent-btn" style="margin-right:12px">Weiter shoppen</button>
      </NuxtLink>
      <NuxtLink to="/">
        <button class="icon-btn">Zum Dashboard</button>
      </NuxtLink>
    </div>
  </div>
</template>
<script setup lang="ts">
definePageMeta({ layout: 'default' })
onMounted(() => { localStorage.removeItem('plexora-cart') })
</script>
