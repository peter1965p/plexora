<template>
  <div class="page">
    <div v-if="!kit" class="card" style="padding:32px;text-align:center;color:var(--text-muted)">Dieses Paket gibt es nicht.</div>
    <template v-else>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <div>
          <h1 style="font-size:22px;font-weight:800;margin:0"><i class="ti" :class="kit.tablerIcon" style="color:var(--accent);margin-right:8px"></i>{{ kit.name }}</h1>
          <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">{{ kit.desc }}</p>
        </div>
        <button class="accent-btn" @click="openNew"><i class="ti ti-plus"></i> {{ entity.one }} anlegen</button>
      </div>

      <div class="tabs">
        <button v-for="e in kit.entities" :key="e.key" class="tab" :class="{ on: e.key === tab }" @click="tab = e.key; query = ''">
          <i class="ti" :class="e.icon"></i> {{ e.label }} <span class="cnt">{{ (data[e.key] || []).length }}</span>
        </button>
      </div>

      <div class="card">
        <div class="card-header" style="gap:12px">
          <span class="card-title">{{ entity.label }}</span>
          <input v-model="query" class="f-input" type="search" placeholder="Suchen …" style="max-width:240px;margin-left:auto" aria-label="Suchen" />
        </div>
        <div v-if="loading" style="padding:24px;color:var(--text-muted)"><i class="ti ti-loader-2 spin"></i></div>
        <div v-else-if="loadError" class="err" style="margin:12px">{{ loadError }}</div>
        <div v-else-if="!rows.length" style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px">
          {{ query ? 'Kein Treffer.' : `Noch keine Einträge. Lege mit „${entity.one} anlegen“ den ersten an.` }}
        </div>
        <div v-else style="overflow-x:auto">
          <table class="data-table">
            <thead><tr><th v-for="k in entity.list" :key="k">{{ field(k).label }}</th><th style="width:90px"></th></tr></thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id">
                <td v-for="k in entity.list" :key="k"><span v-if="field(k).type === 'select'" class="pill" :class="pillClass(r[k])">{{ r[k] }}</span><template v-else>{{ show(field(k), r[k]) }}</template></td>
                <td style="text-align:right;white-space:nowrap">
                  <button class="icon-btn" title="Bearbeiten" @click="openEdit(r)"><i class="ti ti-edit"></i></button>
                  <button class="icon-btn" title="Löschen" @click="remove(r)"><i class="ti ti-trash"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="sumValue !== null" style="padding:12px 16px;border-top:0.5px solid var(--border);font-size:13px;text-align:right">
          {{ sumLabel }}: <strong>{{ sumText }}</strong>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:12px"><i class="ti ti-info-circle"></i> Dieses Paket führt Listen und Stände. Es bucht kein Geld und stellt keine Rechnungen aus (das machst du unter Finanzen). Bitte keine Gesundheitsdaten oder andere besonders sensible Angaben eintragen.</p>

      <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
        <div class="modal-card" role="dialog" aria-modal="true" :aria-label="entity.one">
          <div class="modal-header">
            <span class="card-title">{{ editingId ? entity.one + ' bearbeiten' : entity.one + ' anlegen' }}</span>
            <button class="icon-btn" @click="showForm = false"><i class="ti ti-x"></i></button>
          </div>
          <form class="modal-body" @submit.prevent="save">
            <div v-for="f in entity.fields" :key="f.key">
              <label v-if="f.type !== 'bool'" class="f-label">{{ f.label }}<span v-if="f.required" style="color:#E05C5C"> *</span></label>
              <textarea v-if="f.type === 'longtext'" v-model="form[f.key]" class="f-input" rows="3" maxlength="2000"></textarea>
              <select v-else-if="f.type === 'select'" v-model="form[f.key]" class="f-input">
                <option v-if="!f.required" value="">—</option>
                <option v-else value="" disabled>Bitte wählen</option>
                <option v-for="o in f.options" :key="o" :value="o">{{ o }}</option>
              </select>
              <select v-else-if="f.type === 'ref'" v-model="form[f.key]" class="f-input">
                <option value="">{{ f.required ? 'Bitte wählen' : '—' }}</option>
                <option v-for="o in data[f.ref!] || []" :key="o.id" :value="o.id">{{ label(f.ref!, o) }}</option>
              </select>
              <label v-else-if="f.type === 'bool'" style="display:flex;align-items:center;gap:8px;font-size:13px"><input v-model="form[f.key]" type="checkbox" /> {{ f.label }}</label>
              <input v-else v-model="form[f.key]" class="f-input" :type="inputType(f)" :step="f.type === 'money' ? '0.01' : f.type === 'number' ? 'any' : undefined" :min="f.type === 'money' ? '0' : undefined" :placeholder="f.placeholder" maxlength="200" />
              <div v-if="f.type === 'ref' && !(data[f.ref!] || []).length" style="font-size:11px;color:var(--text-muted);margin-top:3px">Lege zuerst unter „{{ kit.entities.find(e => e.key === f.ref)?.label }}“ einen Eintrag an.</div>
            </div>
            <div v-if="formError" class="err">{{ formError }}</div>
            <div style="display:flex;gap:8px;justify-content:flex-end">
              <button type="button" class="icon-btn" style="width:auto;padding:0 14px" @click="showForm = false">Abbrechen</button>
              <button type="submit" class="accent-btn" :disabled="saving"><i class="ti" :class="saving ? 'ti-loader-2 spin' : 'ti-device-floppy'"></i> Speichern</button>
            </div>
          </form>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { kitPackage, kitSum, type KitEntity, type KitField } from '~~/shared/branchKit'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const kit = computed(() => kitPackage(route.params.pkg))
const tab = ref(kit.value?.entities[0].key || '')
const entity = computed<KitEntity>(() => kit.value!.entities.find(e => e.key === tab.value) || kit.value!.entities[0])
const data = reactive<Record<string, any[]>>({})
const loading = ref(true), loadError = ref(''), query = ref('')

const field = (k: string): KitField => entity.value.fields.find(f => f.key === k)!
const inputType = (f: KitField) => (f.type === 'money' || f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text')
const fmtDate = (s: string) => (s ? new Date(s + 'T00:00:00').toLocaleDateString('de-DE') : '')
const fmtMoney = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })

/** Anzeigename eines Eintrags: sein Hauptfeld, bei Verweisen der Name des Ziels */
function label(entityKey: string, rec: any, depth = 0): string {
  const e = kit.value!.entities.find(x => x.key === entityKey)
  if (!e || !rec) return '—'
  const f = e.fields.find(x => x.key === e.title)!
  const v = rec[e.title]
  if (f?.type === 'ref' && depth < 3) return label(f.ref!, (data[f.ref!] || []).find(r => r.id === v), depth + 1)
  return f ? show(f, v) || '—' : String(v ?? '—')
}
function show(f: KitField, v: any): string {
  if (v === undefined || v === null || v === '') return ''
  if (f.type === 'date') return fmtDate(v)
  if (f.type === 'money') return fmtMoney(Number(v))
  if (f.type === 'ref') return label(f.ref!, (data[f.ref!] || []).find(r => r.id === v))
  if (f.type === 'bool') return v ? 'ja' : 'nein'
  return String(v)
}
const pillClass = (v: string) => (/^(aktiv|bezahlt|erledigt|erschienen|teilgenommen|anwesend|einsatzbereit|Mitglied geworden|durchgeführt|eingelassen)$/.test(v) ? 'ok' : /^(offen|neu|geplant|angemeldet|vereinbart|unterwegs|Anmeldung offen)$/.test(v) ? 'warn' : /^(gekündigt|abgesagt|storniert|ausgefallen|unentschuldigt|ausgetreten|außer Dienst|inaktiv|ausgebucht)$/.test(v) ? 'bad' : '')

const rows = computed(() => {
  const all = data[entity.value.key] || []
  const q = query.value.trim().toLowerCase()
  if (!q) return all
  return all.filter(r => entity.value.fields.some(f => show(f, r[f.key]).toLowerCase().includes(q)))
})
const sumValue = computed(() => kitSum(entity.value, data[entity.value.key] || []))
const sumLabel = computed(() => {
  const e = entity.value
  if (!e.sum) return ''
  const unit = field(e.sum).type === 'money' ? '' : ' (Stunden)'
  return e.sumWhere ? `Summe „${field(e.sumWhere[0]).label}: ${e.sumWhere[1]}“${unit}` : `Summe${unit}`
})
const sumText = computed(() => (entity.value.sum && field(entity.value.sum).type === 'money' ? fmtMoney(sumValue.value || 0) : String(sumValue.value)))

async function headers() { const { useAuthHeader } = await import('~/composables/useAuth'); return await useAuthHeader() }
const url = (e: string, id?: string) => useApiUrl(`/api/branchen/${kit.value!.key}/${e}${id ? '/' + id : ''}`)

async function loadAll() {
  if (!kit.value) return
  loading.value = true; loadError.value = ''
  try {
    const h = await headers()
    await Promise.all(kit.value.entities.map(async e => { data[e.key] = (await $fetch<any>(url(e.key), { headers: h })).records || [] }))
  } catch (e: any) {
    loadError.value = e?.data?.message || 'Die Daten konnten nicht geladen werden.'
  } finally { loading.value = false }
}

const showForm = ref(false), editingId = ref(''), saving = ref(false), formError = ref('')
const form = reactive<Record<string, any>>({})
function resetForm(src: any = {}) {
  for (const k of Object.keys(form)) delete form[k]
  for (const f of entity.value.fields) form[f.key] = f.type === 'bool' ? !!src[f.key] : (src[f.key] ?? (f.type === 'select' && f.required ? f.options![0] : ''))
  formError.value = ''
}
function openNew() { editingId.value = ''; resetForm(); showForm.value = true }
function openEdit(r: any) { editingId.value = r.id; resetForm(r); showForm.value = true }
async function save() {
  saving.value = true; formError.value = ''
  try {
    const body: Record<string, any> = {}
    for (const f of entity.value.fields) { const v = form[f.key]; if (v !== '' && v !== null && v !== undefined) body[f.key] = v; else if (f.type === 'bool') body[f.key] = false }
    await $fetch(url(entity.value.key, editingId.value || undefined), { method: editingId.value ? 'PUT' : 'POST', headers: await headers(), body })
    showForm.value = false
    await loadAll()
  } catch (e: any) {
    formError.value = e?.data?.message || 'Speichern fehlgeschlagen.'
  } finally { saving.value = false }
}
async function remove(r: any) {
  if (!confirm(`${entity.value.one} „${label(entity.value.key, r)}“ wirklich löschen?`)) return
  try { await $fetch(url(entity.value.key, r.id), { method: 'DELETE', headers: await headers() }); await loadAll() }
  catch (e: any) { loadError.value = e?.data?.message || 'Löschen fehlgeschlagen.' }
}

onMounted(loadAll)
watch(() => route.params.pkg, () => { tab.value = kit.value?.entities[0].key || ''; loadAll() })
</script>

<style scoped>
.tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; border-bottom: 0.5px solid var(--border) }
.tab { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer }
.tab.on { color: var(--accent); border-bottom-color: var(--accent) }
.cnt { font-size: 11px; padding: 1px 7px; border-radius: 99px; background: var(--bg-hover); color: var(--text-secondary) }
.f-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 5px }
.f-input { display: block; width: 100%; box-sizing: border-box; padding: 9px 12px; font-size: 13px; font-family: inherit; color: var(--text-primary); background: var(--bg-elevated); border: 0.5px solid var(--border); border-radius: 10px; outline: none }
.f-input:focus { border-color: var(--accent) }
textarea.f-input { resize: vertical }
.pill { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 99px; background: var(--bg-hover); color: var(--text-secondary) }
.pill.ok { background: rgba(34,197,94,.15); color: #22c55e }
.pill.warn { background: rgba(240,180,40,.16); color: #d99a00 }
.pill.bad { background: rgba(224,92,92,.15); color: #E05C5C }
.err { padding: 10px 12px; border-radius: 8px; background: rgba(224,92,92,.12); color: #E05C5C; font-size: 12px }
</style>
