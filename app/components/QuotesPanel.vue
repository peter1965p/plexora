<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { QUOTE_STATUS_LABELS, totals, addDays, todayIso, type QuoteStatus } from '~~/shared/quotes'

// Angebote (Reiter "Angebote" in Finanzen): Liste, anlegen/ändern, PDF, per Mail senden (mit Link zum Online-Annehmen), Status, Rechnung daraus.
// Alle Regeln (wer was darf, Statuswechsel) setzt der Server durch; die Knöpfe hier blenden nur aus, was ohnehin abgelehnt würde.
const props = defineProps<{ services?: any[]; articles?: any[]; prefill?: { client?: string; clientEmail?: string; title?: string; description?: string; price?: number } | null; openNew?: boolean }>()
const emit = defineEmits<{ (e: 'invoice-created'): void }>()

interface Item { description: string; qty: number; price: number }
const quotes = ref<any[]>([]), loading = ref(true), saving = ref(false), busy = ref(''), toast = ref(''), errorMsg = ref('')
const showForm = ref(false), editingId = ref('')
const emptyItem = (): Item => ({ description: '', qty: 1, price: 0 })
const form = reactive({ client: '', clientEmail: '', clientAddress: '', title: '', intro: '', note: '', validUntil: addDays(todayIso(), 14), items: [emptyItem()] as Item[] })
const formTotals = computed(() => totals(form.items.map(i => ({ description: i.description, qty: Number(i.qty) || 0, price: Number(i.price) || 0 }))))
const eur = (n: number) => Number(n || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
const dateDe = (iso: string) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString('de-DE') : '–')

const api = async <T>(path: string, opts: any = {}): Promise<T> => {
  const { useAuthHeader } = await import('~/composables/useAuth')
  return await $fetch<T>(useApiUrl(`/api/quotes${path}`), { ...opts, headers: await useAuthHeader() })
}
const say = (m: string) => { toast.value = m; setTimeout(() => { toast.value = '' }, 4000) }
const err = (e: any, fallback: string) => { errorMsg.value = e?.data?.message || fallback; setTimeout(() => { errorMsg.value = '' }, 8000) }

async function load() {
  loading.value = true
  try { quotes.value = ((await api<any>('')) as any).quotes || [] } catch (e) { err(e, 'Angebote konnten nicht geladen werden.') } finally { loading.value = false }
}
function resetForm() { Object.assign(form, { client: '', clientEmail: '', clientAddress: '', title: '', intro: '', note: '', validUntil: addDays(todayIso(), 14), items: [emptyItem()] }); editingId.value = '' }
function openNewForm() {
  resetForm()
  const p = props.prefill
  if (p) { form.client = p.client || ''; form.clientEmail = p.clientEmail || ''; form.title = p.title || ''; if (p.description) { form.items[0].description = p.description; form.items[0].price = Number(p.price) || 0 } }
  showForm.value = true
}
function openEdit(q: any) {
  resetForm(); editingId.value = q.quoteId
  Object.assign(form, { client: q.client, clientEmail: q.clientEmail || '', clientAddress: q.clientAddress || '', title: q.title || '', intro: q.intro || '', note: q.note || '', validUntil: q.validUntil < todayIso() ? addDays(todayIso(), 14) : q.validUntil, items: q.items.map((i: any) => ({ ...i })) })
  showForm.value = true
}
const addItem = () => form.items.push(emptyItem())
const removeItem = (i: number) => { if (form.items.length > 1) form.items.splice(i, 1) }
function applyCatalog(item: Item, value: string) {
  const [type, id] = value.split(':')
  const src: any = type === 'service' ? props.services?.find((x: any) => x.serviceId === id) : props.articles?.find((x: any) => x.articleId === id)
  if (src) { item.description = src.name; item.price = Number(src.price) || 0 }
}

async function save(sendAfter: boolean) {
  saving.value = true; errorMsg.value = ''
  try {
    const body = { client: form.client, clientEmail: form.clientEmail, clientAddress: form.clientAddress, title: form.title, intro: form.intro, note: form.note, validUntil: form.validUntil, items: form.items.map(i => ({ description: i.description, qty: Number(i.qty), price: Number(i.price) })) }
    const r: any = editingId.value ? await api(`/${editingId.value}`, { method: 'PUT', body }) : await api('', { method: 'POST', body })
    showForm.value = false
    if (sendAfter) await send(r.quote, true)
    else say(editingId.value ? 'Angebot gespeichert.' : `Angebot ${r.quote.number} angelegt.`)
    await load()
  } catch (e) { err(e, 'Das Angebot konnte nicht gespeichert werden.') } finally { saving.value = false }
}
async function send(q: any, quiet = false) {
  busy.value = q.quoteId
  try { const r: any = await api(`/${q.quoteId}/send`, { method: 'POST' }); say(r.message || 'Angebot gesendet.'); if (!quiet) await load() } catch (e) { err(e, 'Das Angebot konnte nicht gesendet werden.') } finally { busy.value = '' }
}
async function setStatus(q: any, status: 'accepted' | 'declined') {
  busy.value = q.quoteId
  try { await api(`/${q.quoteId}/status`, { method: 'POST', body: { status } }); say(status === 'accepted' ? 'Als angenommen markiert.' : 'Als abgelehnt markiert.'); await load() } catch (e) { err(e, 'Status konnte nicht geändert werden.') } finally { busy.value = '' }
}
async function toInvoice(q: any) {
  busy.value = q.quoteId
  try { const r: any = await api(`/${q.quoteId}/to-invoice`, { method: 'POST' }); say(`Rechnung ${r.number} angelegt (Reiter Rechnungen).`); emit('invoice-created'); await load() } catch (e) { err(e, 'Die Rechnung konnte nicht angelegt werden.') } finally { busy.value = '' }
}
async function remove(q: any) {
  if (!window.confirm(`Angebot ${q.number} wirklich löschen?`)) return
  busy.value = q.quoteId
  try { await api(`/${q.quoteId}`, { method: 'DELETE' }); await load() } catch (e) { err(e, 'Löschen nicht möglich.') } finally { busy.value = '' }
}
async function pdf(q: any) {
  busy.value = q.quoteId
  try {
    const blob: Blob = await api(`/${q.quoteId}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Angebot-${q.number}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000)
  } catch (e) { err(e, 'PDF konnte nicht erstellt werden.') } finally { busy.value = '' }
}

const badge = (s: QuoteStatus) => ({ draft: 'badge-gray', sent: 'badge-blue', accepted: 'badge-green', declined: 'badge-red', expired: 'badge-orange' } as Record<string, string>)[s] || ''
const canEdit = (q: any) => q.status === 'draft' || q.status === 'expired'
const canSend = (q: any) => (q.status === 'draft' || q.status === 'sent') && !!q.clientEmail
const canDelete = (q: any) => ['draft', 'declined', 'expired'].includes(q.status)
const stats = computed(() => ({ open: quotes.value.filter(q => q.status === 'sent').length, accepted: quotes.value.filter(q => q.status === 'accepted').length, sum: quotes.value.filter(q => q.status === 'sent').reduce((s, q) => s + Number(q.gross || 0), 0) }))

onMounted(async () => { await load(); if (props.openNew) openNewForm() })
defineExpose({ openNewForm })
</script>

<template>
  <div class="card">
    <div class="card-header">
      <span class="card-title">Angebote<HelpTip k="angebot" /></span>
      <span style="font-size:12px;color:var(--text-muted)">{{ stats.open }} offen ({{ eur(stats.sum) }}) · {{ stats.accepted }} angenommen</span>
      <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openNewForm"><i class="ti ti-plus"></i> Neues Angebot</button>
    </div>
    <div v-if="errorMsg" style="margin:0 16px 10px;padding:10px 14px;border-radius:8px;background:#E05C5C18;color:#E05C5C;font-size:13px">{{ errorMsg }}</div>
    <div v-if="toast" style="margin:0 16px 10px;padding:10px 14px;border-radius:8px;background:#00C85318;color:#00A844;font-size:13px">{{ toast }}</div>
    <table class="data-table">
      <thead><tr><th>Nummer</th><th>Kunde</th><th>Titel</th><th>Brutto</th><th>Gültig bis</th><th>Status</th><th style="width:210px"></th></tr></thead>
      <tbody>
        <tr v-if="loading"><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Lädt…</td></tr>
        <tr v-else-if="!quotes.length"><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">Noch keine Angebote. Mit „Neues Angebot“ legst du das erste an.</td></tr>
        <tr v-for="q in quotes" :key="q.quoteId">
          <td class="td-name">{{ q.number }}</td>
          <td>{{ q.client }}<div style="font-size:11px;color:var(--text-muted)">{{ q.clientEmail || 'keine E-Mail' }}</div></td>
          <td style="font-size:12px">{{ q.title || '–' }}</td>
          <td>{{ eur(q.gross) }}</td>
          <td style="font-size:12px">{{ dateDe(q.validUntil) }}</td>
          <td><span class="badge" :class="badge(q.status)">{{ QUOTE_STATUS_LABELS[q.status as QuoteStatus] }}</span><i v-if="q.invoiceId" class="ti ti-receipt" style="margin-left:6px;color:#a78bfa" title="Rechnung angelegt"></i></td>
          <td>
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <button class="icon-btn" title="PDF" :disabled="busy === q.quoteId" @click="pdf(q)"><i class="ti ti-file-type-pdf"></i></button>
              <button v-if="canEdit(q)" class="icon-btn" title="Bearbeiten" @click="openEdit(q)"><i class="ti ti-pencil"></i></button>
              <button v-if="canSend(q)" class="icon-btn" :title="q.status === 'sent' ? 'Erneut senden (neuer Link)' : 'Per E-Mail senden'" style="color:var(--accent)" :disabled="busy === q.quoteId" @click="send(q)"><i v-if="busy === q.quoteId" class="ti ti-loader-2 spin"></i><i v-else class="ti ti-send"></i></button>
              <button v-if="q.status === 'sent'" class="icon-btn" title="Als angenommen markieren" style="color:#00A844" :disabled="busy === q.quoteId" @click="setStatus(q, 'accepted')"><i class="ti ti-check"></i></button>
              <button v-if="q.status === 'sent'" class="icon-btn" title="Als abgelehnt markieren" style="color:#E05C5C" :disabled="busy === q.quoteId" @click="setStatus(q, 'declined')"><i class="ti ti-x"></i></button>
              <button v-if="q.status === 'accepted' && !q.invoiceId" class="icon-btn" title="In Rechnung umwandeln" style="color:#a78bfa" :disabled="busy === q.quoteId" @click="toInvoice(q)"><i class="ti ti-receipt"></i></button>
              <button v-if="canDelete(q)" class="icon-btn" title="Löschen" style="color:var(--danger)" :disabled="busy === q.quoteId" @click="remove(q)"><i class="ti ti-trash"></i></button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
    <div class="modal-card">
      <div class="modal-header"><span class="card-title">{{ editingId ? 'Angebot bearbeiten' : 'Neues Angebot' }}</span><button class="icon-btn" @click="showForm = false"><i class="ti ti-x"></i></button></div>
      <div class="modal-body">
        <div v-if="errorMsg" style="margin-bottom:10px;padding:10px 14px;border-radius:8px;background:#E05C5C18;color:#E05C5C;font-size:13px">{{ errorMsg }}</div>
        <div class="auth-row">
          <div class="auth-field"><label>Kunde *</label><input v-model="form.client" maxlength="120" placeholder="Firma GmbH oder Name" /></div>
          <div class="auth-field"><label>E-Mail des Kunden</label><input v-model="form.clientEmail" maxlength="254" placeholder="kunde@firma.de" /></div>
        </div>
        <div class="auth-field"><label>Adresse (optional)</label><input v-model="form.clientAddress" maxlength="300" placeholder="Straße, PLZ Ort" /></div>
        <div class="auth-row">
          <div class="auth-field"><label>Titel</label><input v-model="form.title" maxlength="120" placeholder="z. B. Website-Paket Aktion" /></div>
          <div class="auth-field"><label>Gültig bis</label><input v-model="form.validUntil" type="date" :min="todayIso()" /></div>
        </div>
        <div class="auth-field"><label>Einleitung (optional)</label><textarea v-model="form.intro" rows="2" maxlength="1500" placeholder="z. B. vielen Dank für Ihre Anfrage …"></textarea></div>
        <label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin:10px 0 6px">Positionen</label>
        <div v-for="(item, idx) in form.items" :key="idx" style="display:flex;gap:6px;align-items:flex-end;margin-bottom:8px;flex-wrap:wrap">
          <div class="auth-field" style="margin:0;flex:2;min-width:160px"><input v-model="item.description" maxlength="300" placeholder="Beschreibung" /></div>
          <select v-if="services?.length || articles?.length" class="form-select" style="height:36px;width:150px" @change="applyCatalog(item, ($event.target as HTMLSelectElement).value)">
            <option value="">aus Katalog</option>
            <optgroup v-if="services?.length" label="Leistungen"><option v-for="s in services" :key="s.serviceId" :value="'service:' + s.serviceId">{{ s.name }}</option></optgroup>
            <optgroup v-if="articles?.length" label="Artikel"><option v-for="a in articles" :key="a.articleId" :value="'article:' + a.articleId">{{ a.name }}</option></optgroup>
          </select>
          <div class="auth-field" style="margin:0;width:70px"><input v-model.number="item.qty" type="number" min="0" step="any" placeholder="Menge" /></div>
          <div class="auth-field" style="margin:0;width:100px"><input v-model.number="item.price" type="number" min="0" step="any" placeholder="Preis netto" /></div>
          <button class="icon-btn" style="color:var(--danger)" :disabled="form.items.length === 1" @click="removeItem(idx)"><i class="ti ti-trash"></i></button>
        </div>
        <button class="icon-btn" style="font-size:12px;padding:0 10px;height:26px;margin-bottom:10px" @click="addItem"><i class="ti ti-plus"></i> Position</button>
        <div style="text-align:right;font-size:13px;margin-bottom:10px">Netto {{ eur(formTotals.net) }} · MwSt {{ eur(formTotals.vat) }} · <strong>Brutto {{ eur(formTotals.gross) }}</strong><div style="font-size:11px;color:var(--text-muted)">Steuersatz laut deinen Rechnungs-Einstellungen; endgültig beim Speichern</div></div>
        <div class="auth-field"><label>Hinweis am Ende (optional)</label><textarea v-model="form.note" rows="2" maxlength="1500" placeholder="z. B. Zahlungsbedingungen, Lieferzeit"></textarea></div>
        <div style="display:flex;gap:10px">
          <button class="auth-btn" :disabled="saving" style="flex:1" @click="save(false)"><span v-if="saving"><i class="ti ti-loader-2 spin"></i></span><span v-else><i class="ti ti-device-floppy"></i> Als Entwurf speichern</span></button>
          <button class="auth-btn" :disabled="saving || !form.clientEmail" style="flex:1;background:var(--accent)" @click="save(true)"><span v-if="saving"><i class="ti ti-loader-2 spin"></i></span><span v-else><i class="ti ti-send"></i> Speichern und senden</span></button>
        </div>
      </div>
    </div>
  </div>
</template>
