<template>
  <div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-header"><span class="card-title"><i class="ti ti-inbox" style="margin-right:8px;color:var(--accent)"></i>{{ tr('Eingangsrechnung lesen') }}</span></div>
      <div style="padding:16px">
        <p style="font-size:13px;color:var(--text-muted);margin:0 0 12px">{{ tr('Lade eine E-Rechnung hoch: eine') }} <strong>{{ tr('XRechnung (XML)') }}</strong> {{ tr('oder eine') }} <strong>{{ tr('ZUGFeRD-/Factur-X-PDF') }}</strong>{{ tr('. Plexora liest sie, prüft die Summen und legt sie unter Eingangsrechnungen ab. Unterstützt werden die Formate CII und UBL.') }}</p>
        <label class="drop" :class="{ over }" @dragover.prevent="over = true" @dragleave="over = false" @drop.prevent="onDrop">
          <i class="ti ti-upload" style="font-size:22px;color:var(--accent)"></i>
          <span>{{ busy ? 'Wird gelesen …' : 'Datei hierher ziehen oder klicken (XML oder PDF, höchstens 3 MB)' }}</span>
          <input type="file" accept=".xml,.pdf,application/xml,text/xml,application/pdf" style="display:none" @change="onPick" />
        </label>
        <div v-if="error" class="err" style="margin-top:12px">{{ error }}</div>

        <div v-if="preview" class="prev">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <div style="font-size:12px;color:var(--text-muted)">{{ preview.invoice.credit ? 'Gutschrift' : 'Rechnung' }} {{ tr('· Format') }} {{ preview.invoice.format === 'cii' ? 'CII' : 'UBL' }}{{ preview.source === 'pdf' ? ' (aus ZUGFeRD-PDF)' : '' }}</div>
              <div style="font-size:17px;font-weight:800">{{ preview.invoice.number }}</div>
              <div style="font-size:13px">{{ preview.invoice.seller.name }}<span v-if="preview.invoice.seller.city" style="color:var(--text-muted)"> · {{ preview.invoice.seller.zip }} {{ preview.invoice.seller.city }}</span></div>
              <div v-if="preview.invoice.seller.vatId" style="font-size:12px;color:var(--text-muted)">{{ tr('USt-IdNr.') }} {{ preview.invoice.seller.vatId }}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:12px;color:var(--text-muted)">{{ tr('Datum') }} {{ fmtDate(preview.invoice.issueDate) }}<span v-if="preview.invoice.dueDate"> {{ tr('· fällig') }} {{ fmtDate(preview.invoice.dueDate) }}</span></div>
              <div style="font-size:20px;font-weight:800;color:var(--accent)">{{ eur(preview.invoice.totals.payable) }}</div>
              <div style="font-size:12px;color:var(--text-muted)">{{ tr('netto') }} {{ eur(preview.invoice.totals.net) }} {{ tr('· Steuer') }} {{ eur(preview.invoice.totals.tax) }}</div>
            </div>
          </div>
          <table v-if="preview.invoice.lines.length" class="data-table" style="margin-top:10px">
            <thead><tr><th>{{ tr('Position') }}</th><th style="text-align:right">{{ tr('Menge') }}</th><th style="text-align:right">{{ tr('Einzelpreis') }}</th><th style="text-align:right">{{ tr('Steuer') }}</th></tr></thead>
            <tbody><tr v-for="(l, i) in preview.invoice.lines" :key="i"><td>{{ l.name }}</td><td style="text-align:right">{{ l.qty }}</td><td style="text-align:right">{{ eur(l.netPrice) }}</td><td style="text-align:right">{{ l.taxRate }} %</td></tr></tbody>
          </table>
          <div v-if="preview.invoice.iban" style="font-size:12px;margin-top:8px">{{ tr('IBAN:') }} <code>{{ preview.invoice.iban }}</code><span v-if="preview.invoice.reference" style="color:var(--text-muted)"> {{ tr('· Verwendungszweck:') }} {{ preview.invoice.reference }}</span></div>
          <div v-if="preview.hints.length" class="warn"><i class="ti ti-alert-triangle"></i> <span v-for="(h, i) in preview.hints" :key="i">{{ h }} </span></div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="accent-btn" :disabled="busy" @click="save"><i class="ti ti-device-floppy"></i> {{ tr('Speichern') }}</button>
            <button class="icon-btn" style="width:auto;padding:0 12px" @click="preview = null">{{ tr('Verwerfen') }}</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><span class="card-title">{{ tr('Eingangsrechnungen') }}</span><span style="font-size:12px;color:var(--text-muted)">{{ tr('offen:') }} {{ eur(openSum) }}</span></div>
      <div v-if="loading" style="padding:20px;color:var(--text-muted)"><i class="ti ti-loader-2 spin"></i></div>
      <div v-else-if="!rows.length" style="padding:28px;text-align:center;color:var(--text-muted);font-size:13px">{{ tr('Noch keine Eingangsrechnungen.') }}</div>
      <div v-else style="overflow-x:auto">
        <table class="data-table">
          <thead><tr><th>{{ tr('Nummer') }}</th><th>{{ tr('Rechnungssteller') }}</th><th>{{ tr('Datum') }}</th><th>{{ tr('Fällig') }}</th><th style="text-align:right">{{ tr('Betrag') }}</th><th>{{ tr('Stand') }}</th><th style="width:90px"></th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.incomingId">
              <td><strong>{{ r.number }}</strong><span v-if="r.credit" class="tag">{{ tr('Gutschrift') }}</span><i v-if="r.hints?.length" class="ti ti-alert-triangle" style="color:#d99a00;margin-left:6px" :title="r.hints.join(' ')"></i></td>
              <td>{{ r.sellerName }}</td>
              <td>{{ fmtDate(r.issueDate) }}</td>
              <td>{{ fmtDate(r.dueDate) }}</td>
              <td style="text-align:right">{{ eur(r.payable) }}</td>
              <td>
                <select class="st" :value="r.status" @change="setStatus(r, ($event.target as HTMLSelectElement).value)"><option value="offen">{{ tr('offen') }}</option><option value="bezahlt">{{ tr('bezahlt') }}</option></select>
              </td>
              <td style="text-align:right;white-space:nowrap">
                <button class="icon-btn" :title="tr('Original-XML herunterladen')" @click="download(r)"><i class="ti ti-file-code"></i></button>
                <button class="icon-btn" :title="tr('Löschen')" style="color:var(--danger)" @click="remove(r)"><i class="ti ti-trash"></i></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'changed'): void }>()
const rows = ref<any[]>([]), loading = ref(true), busy = ref(false), error = ref(''), preview = ref<any>(null), over = ref(false)
let payload: { xml?: string; pdfBase64?: string } = {}
const eur = (n: number) => Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
const fmtDate = (s: string) => (s ? new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('de-DE') : '–')
const openSum = computed(() => rows.value.filter(r => r.status === 'offen').reduce((s, r) => s + (r.credit ? -1 : 1) * (Number(r.payable) || 0), 0))
async function headers() { const { useAuthHeader } = await import('~/composables/useAuth'); return await useAuthHeader() }
const api = (p = '') => useApiUrl('/api/finance/incoming' + p)
const msg = (e: any, fb: string) => e?.data?.message || fb

async function load() {
  loading.value = true
  try { rows.value = (await $fetch<any>(api(), { headers: await headers() })).records || [] } catch (e: any) { error.value = msg(e, tr('Die Liste konnte nicht geladen werden.')) } finally { loading.value = false }
}
function toBase64(buf: ArrayBuffer) { let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s) }
async function readFile(f: File) {
  error.value = ''; preview.value = null
  if (f.size > 3_000_000) { error.value = tr('Die Datei ist zu groß (höchstens 3 MB).'); return }
  busy.value = true
  try {
    payload = /\.pdf$/i.test(f.name) || f.type === 'application/pdf' ? { pdfBase64: toBase64(await f.arrayBuffer()) } : { xml: await f.text() }
    preview.value = await $fetch<any>(api('/import'), { method: 'POST', headers: await headers(), body: payload })
  } catch (e: any) { error.value = msg(e, tr('Die Datei konnte nicht gelesen werden.')) } finally { busy.value = false }
}
const onPick = (e: Event) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) readFile(f); (e.target as HTMLInputElement).value = '' }
const onDrop = (e: DragEvent) => { over.value = false; const f = e.dataTransfer?.files?.[0]; if (f) readFile(f) }
async function save() {
  busy.value = true; error.value = ''
  try { await $fetch(api(), { method: 'POST', headers: await headers(), body: payload }); preview.value = null; await load(); emit('changed') }
  catch (e: any) { error.value = msg(e, tr('Speichern fehlgeschlagen.')) } finally { busy.value = false }
}
async function setStatus(r: any, status: string) {
  try { await $fetch(api(`/${r.incomingId}`), { method: 'PATCH', headers: await headers(), body: { status } }); r.status = status } catch (e: any) { error.value = msg(e, tr('Ändern fehlgeschlagen.')); await load() }
}
async function remove(r: any) {
  if (!confirm(`Eingangsrechnung ${r.number} von ${r.sellerName} löschen?`)) return
  try { await $fetch(api(`/${r.incomingId}`), { method: 'DELETE', headers: await headers() }); await load() } catch (e: any) { error.value = msg(e, tr('Löschen fehlgeschlagen.')) }
}
async function download(r: any) {
  try {
    const blob = await $fetch<Blob>(api(`/${r.incomingId}/xml`), { headers: await headers(), responseType: 'blob' } as any)
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob as any); a.download = `${r.number || r.incomingId}.xml`; a.click(); URL.revokeObjectURL(a.href)
  } catch (e: any) { error.value = msg(e, 'Download fehlgeschlagen.') }
}
onMounted(load)
</script>

<style scoped>
.drop { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 22px; border: 1.5px dashed var(--border); border-radius: 14px; cursor: pointer; font-size: 13px; color: var(--text-secondary); text-align: center }
.drop:hover, .drop.over { border-color: var(--accent); background: var(--bg-hover) }
.prev { margin-top: 14px; padding: 16px; border: 0.5px solid var(--border); border-radius: 14px; background: var(--bg-elevated) }
.warn { margin-top: 10px; padding: 9px 12px; border-radius: 8px; background: rgba(240,180,40,.14); color: #b07a00; font-size: 12px }
.err { padding: 10px 12px; border-radius: 8px; background: rgba(224,92,92,.12); color: #E05C5C; font-size: 12px }
.tag { margin-left: 8px; font-size: 10px; padding: 1px 7px; border-radius: 99px; background: var(--bg-hover); color: var(--text-secondary) }
.st { background: var(--bg-elevated); color: var(--text-primary); border: 0.5px solid var(--border); border-radius: 8px; padding: 4px 8px; font-size: 12px }
</style>
