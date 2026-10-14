<template>
  <div>
    <h1 class="lp-page-title">Datenschutzerklärung</h1>
    <p class="lp-date">Stand: {{ today }}</p>

    <section class="lp-section">
      <h2 class="lp-section-h">1. Verantwortlicher</h2>
      <p class="lp-text">
        Verantwortlich für die Datenverarbeitung auf dieser Website ist:<br /><br />
        {{ company.legalName }}<br />
        <template v-if="company.representedBy">{{ company.representedBy }}<br /></template>
        {{ company.street }}<br />
        {{ company.zipCity }}<br />
        {{ company.country }}<br />
        <template v-if="company.email">E-Mail: {{ company.email }}<br /></template>
        <template v-if="company.phone">Telefon: {{ company.phone }}</template>
      </p>
    </section>

    <div class="datenschutz-content" v-html="datenschutzHtml"></div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
definePageMeta({ layout: 'lp' })

const today = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })

const company = reactive({
  legalName: '', representedBy: '', street: '', zipCity: '', country: 'Deutschland',
  email: '', phone: '', vatId: '', register: '', registerCourt: ''
})

const { data } = await useFetch(useApiUrl('/api/settings/company'))
if ((data.value as any)?.company) Object.assign(company, (data.value as any).company)

const { data: dsData } = await useFetch(useApiUrl('/api/settings/datenschutz'))
const datenschutz = computed(() => (dsData.value as any)?.datenschutz)
const datenschutzHtml = computed(() => marked.parse(datenschutz.value?.content || ''))
</script>

<style scoped>
.lp-page-title { font-family: "Space Grotesk", sans-serif; font-size: 36px; font-weight: 800; color: #f0eef9; margin: 0 0 8px; letter-spacing: -0.5px; }
.lp-date { font-size: 13px; color: #545870; margin: 0 0 40px; }
.lp-section { margin-bottom: 32px; }
.lp-section-h { font-family: "Space Grotesk", sans-serif; font-size: 18px; font-weight: 700; color: #f0eef9; margin: 0 0 12px; }
.lp-text { font-size: 14px; line-height: 1.9; color: #8b8fa8; margin: 0; }

.datenschutz-content { font-size: 14px; line-height: 1.9; color: #8b8fa8; }
.datenschutz-content :deep(h2) { font-family: "Space Grotesk", sans-serif; font-size: 18px; font-weight: 700; color: #f0eef9; margin: 32px 0 12px; }
.datenschutz-content :deep(h3) { font-family: "Space Grotesk", sans-serif; font-size: 15px; font-weight: 600; color: #c4c2d4; margin: 20px 0 8px; }
.datenschutz-content :deep(p) { margin: 0 0 12px; }
.datenschutz-content :deep(strong) { color: #f0eef9; font-weight: 600; }
.datenschutz-content :deep(em) { color: #c4c2d4; font-style: italic; }
.datenschutz-content :deep(a) { color: #ea580c; text-decoration: none; }
</style>
