<template>
  <div style="min-height:100vh;background:var(--bg-base);display:flex;align-items:flex-start;justify-content:center;padding:32px 16px">
    <div style="max-width:680px;width:100%">
      <div v-if="loading" class="card" style="text-align:center;padding:48px"><i class="ti ti-loader-2 spin" style="font-size:32px;color:var(--accent)"></i><p style="color:var(--text-muted);margin-top:12px">Angebot wird geladen …</p></div>

      <div v-else-if="!q" class="card" style="text-align:center;padding:48px">
        <i class="ti ti-file-off" style="font-size:48px;color:var(--text-muted)"></i>
        <h2 style="margin:16px 0 8px">Angebot nicht gefunden</h2>
        <p style="color:var(--text-muted)">Der Link ist nicht korrekt oder das Angebot wurde ersetzt. Bitte wende dich an den Absender.</p>
      </div>

      <div v-else>
        <div style="text-align:center;margin-bottom:24px">
          <img v-if="q.brand.logo" :src="q.brand.logo" alt="" style="max-height:56px;max-width:200px;object-fit:contain" />
          <div v-else style="font-size:26px;font-weight:800" :style="{ color: q.brand.color }">{{ q.brand.name }}</div>
        </div>

        <div v-if="q.status === 'accepted'" class="banner" style="background:#00C85318;color:#00A844"><i class="ti ti-circle-check"></i> Angenommen. Vielen Dank! {{ q.brand.name }} meldet sich bei Ihnen.</div>
        <div v-else-if="q.status === 'declined'" class="banner" style="background:#E05C5C18;color:#E05C5C"><i class="ti ti-circle-x"></i> Abgelehnt.</div>
        <div v-else-if="q.status === 'expired'" class="banner" style="background:#F0B42822;color:#B07A00"><i class="ti ti-clock-off"></i> Dieses Angebot war bis {{ dateDe(q.validUntil) }} gültig und ist abgelaufen. Bitte fragen Sie bei {{ q.brand.name }} nach einem neuen.</div>

        <div class="card" style="margin-bottom:16px">
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px">
              <div><div style="font-size:12px;color:var(--text-muted)">Angebot</div><div style="font-size:20px;font-weight:800">{{ q.number }}</div></div>
              <div style="text-align:right"><div style="font-size:12px;color:var(--text-muted)">Gültig bis</div><div style="font-weight:700">{{ dateDe(q.validUntil) }}</div></div>
            </div>
            <h2 v-if="q.title" style="margin:0 0 6px;font-size:18px">{{ q.title }}</h2>
            <p style="color:var(--text-muted);margin:0 0 14px">Für: {{ q.client }}</p>
            <p v-if="q.intro" style="white-space:pre-line;margin:0 0 14px">{{ q.intro }}</p>
            <table class="data-table" style="width:100%">
              <thead><tr><th>Position</th><th style="text-align:right">Menge</th><th style="text-align:right">Einzelpreis</th><th style="text-align:right">Gesamt</th></tr></thead>
              <tbody><tr v-for="(i, n) in q.items" :key="n"><td>{{ i.description }}</td><td style="text-align:right">{{ i.qty }}</td><td style="text-align:right">{{ eur(i.price) }}</td><td style="text-align:right">{{ eur(i.qty * i.price) }}</td></tr></tbody>
            </table>
            <div style="margin:14px 0 0 auto;max-width:260px;font-size:14px">
              <div style="display:flex;justify-content:space-between"><span>Netto</span><span>{{ eur(q.net) }}</span></div>
              <div style="display:flex;justify-content:space-between"><span>{{ q.smallBusiness ? 'Umsatzsteuer' : `MwSt ${q.vatRate} %` }}</span><span>{{ eur(q.vat) }}</span></div>
              <div style="display:flex;justify-content:space-between;font-weight:800;font-size:17px;border-top:1.5px solid var(--text);margin-top:6px;padding-top:6px"><span>Gesamt</span><span>{{ eur(q.gross) }}</span></div>
              <div v-if="q.smallBusiness" style="font-size:11px;color:var(--text-muted);margin-top:4px">Gemäß §19 UStG wird keine Umsatzsteuer berechnet.</div>
            </div>
            <p v-if="q.note" style="white-space:pre-line;color:var(--text-muted);margin:16px 0 0;font-size:13px">{{ q.note }}</p>
          </div>
        </div>

        <div v-if="q.canRespond" class="card"><div class="card-body" style="display:flex;gap:10px;flex-wrap:wrap">
          <div v-if="error" style="width:100%;padding:10px 14px;border-radius:8px;background:#E05C5C18;color:#E05C5C;font-size:13px">{{ error }}</div>
          <button class="auth-btn" :disabled="busy" style="flex:2;min-width:200px;background:#00A844" @click="respond('accept')"><i class="ti ti-check"></i> Angebot annehmen</button>
          <button class="auth-btn" :disabled="busy" style="flex:1;min-width:140px;background:transparent;color:var(--text);border:1px solid var(--border)" @click="decline"><i class="ti ti-x"></i> Ablehnen</button>
          <p style="width:100%;font-size:11px;color:var(--text-muted);margin:4px 0 0">Mit „Angebot annehmen“ bestätigen Sie das Angebot {{ q.number }} über {{ eur(q.gross) }}. {{ q.brand.name }} wird benachrichtigt.</p>
        </div></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

// Öffentliche Seite zum Angebot (Link aus der Mail): ansehen, annehmen, ablehnen. Das Geheimnis im Link ist der Nachweis; die Seite wird nicht indexiert.
definePageMeta({ layout: false })
useHead({ title: 'Angebot', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
const route = useRoute()
const q = ref<any>(null), loading = ref(true), busy = ref(false), error = ref('')
const eur = (n: number) => Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
const dateDe = (iso: string) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('de-DE') : '–')
const url = (suffix = '') => useApiUrl(`/api/public/quote/${encodeURIComponent(String(route.params.ref || ''))}${suffix}`)

async function load() { try { q.value = await $fetch(url()) } catch { q.value = null } finally { loading.value = false } }
async function respond(action: 'accept' | 'decline') {
  busy.value = true; error.value = ''
  try { await $fetch(url('/respond'), { method: 'POST', body: { action } }); await load() }
  catch (e: any) { error.value = e?.data?.message || 'Das hat gerade nicht geklappt. Bitte versuchen Sie es später erneut.'; await load() }
  finally { busy.value = false }
}
const decline = () => { if (window.confirm('Angebot wirklich ablehnen?')) respond('decline') }
onMounted(load)
</script>

<style scoped>
.banner { display: flex; gap: 8px; align-items: center; padding: 12px 16px; border-radius: 10px; margin-bottom: 14px; font-size: 14px; font-weight: 600 }
</style>
