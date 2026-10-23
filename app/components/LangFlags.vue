<template>
  <div class="lang-flags lang-switch" role="group" aria-label="Language / Sprache">
    <button :class="{ on: lang === 'de' }" title="Deutsch" aria-label="Deutsch" @click="pick('de')">🇩🇪</button>
    <button :class="{ on: lang === 'en' }" title="English" aria-label="English" @click="pick('en')">🇬🇧</button>
  </div>
</template>

<script setup lang="ts">
// Fähnchen für Seiten ohne Kopfleiste (Anmeldung, Einladung ...); lädt neu, damit feste Listen die Sprache wechseln
const { lang, setLang } = useLang()
const pick = (l: 'de' | 'en') => { if (l === lang.value) return; setLang(l); location.reload() }
</script>

<style scoped>
.lang-flags { position: fixed; top: 16px; right: 16px; z-index: 50; }
</style>
