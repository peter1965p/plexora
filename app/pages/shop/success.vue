<template>
  <div style="min-height:100vh;background:var(--bg-base);display:flex;align-items:center;justify-content:center">
    <div style="text-align:center;max-width:500px;padding:40px">
      <i class="ti ti-circle-check" style="font-size:80px;color:#00D4B4;display:block;margin-bottom:24px"></i>
      <h1 style="font-size:32px;font-weight:800;margin:0 0 12px">Zahlung erfolgreich!</h1>
      <p style="color:var(--text-muted);margin-bottom:8px">Vielen Dank für Ihre Bestellung.</p>
      <p style="color:var(--text-muted);font-size:13px;margin-bottom:32px">
        Bestellnummer: <strong>{{ orderId }}</strong><br>
        Eine Bestätigungsmail wurde an Sie gesendet.
      </p>
      <div style="display:flex;gap:12px;justify-content:center">
        <NuxtLink to="/shop"><button class="accent-btn">Weiter einkaufen</button></NuxtLink>
        <NuxtLink to="/portal"><button class="theme-opt">Meine Bestellungen</button></NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })
const route   = useRoute()
const orderId = computed(() => (route.query.order_id as string)?.slice(0,8).toUpperCase() || '–')
</script>
