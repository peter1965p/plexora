<template>
  <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#050815">
    <div style="color:rgba(255,255,255,0.3);font-size:13px">Weiterleitung...</div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const slug  = route.params.vanity as string

await navigateTo('/lead/' + slug, { replace: true })
</script>
