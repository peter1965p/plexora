<template>
  <div class="page">
    <div class="header-row">
      <div>
        <h1 class="title">Preisschild-<span style="color:var(--accent)">Vorlagen</span></h1>
        <p class="subtitle">Gestalte Vorlagen für Fahrzeug-Preisschilder — Layout wählen, mit Feldern befüllen, live prüfen.</p>
      </div>
      <div class="header-actions">
        <button class="icon-btn" title="Zurück zu Fahrzeugen" @click="navigateTo('/automotive')"><i class="ti ti-arrow-left"></i></button>
        <button v-if="mode === 'list'" class="accent-btn" @click="mode = 'presets'">
          <i class="ti ti-plus"></i> Neue Vorlage
        </button>
        <template v-else-if="mode === 'editor'">
          <span v-if="savedAt" class="saved-hint"><i class="ti ti-check"></i> Gespeichert {{ savedAt }}</span>
          <button class="icon-btn" @click="mode = 'list'"><i class="ti ti-x"></i></button>
          <button class="accent-btn" :disabled="saving || !draft.name.trim()" @click="saveTemplate">
            <i class="ti" :class="saving ? 'ti-loader-2 spin' : 'ti-device-floppy'"></i> Speichern
          </button>
        </template>
      </div>
    </div>

    <div v-if="loading" class="loading-state"><i class="ti ti-loader-2 spin"></i></div>

    <!-- ── LISTE ── -->
    <template v-else-if="mode === 'list'">
      <div v-if="!templates.length" style="text-align:center;padding:80px;color:var(--text-muted)">
        <i class="ti ti-id-badge-2" style="font-size:48px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px;margin-bottom:16px">Noch keine Preisschild-Vorlage angelegt.</p>
        <button class="accent-btn" @click="mode = 'presets'"><i class="ti ti-plus" style="margin-right:6px"></i>Erste Vorlage anlegen</button>
      </div>
      <div v-else class="template-grid">
        <div v-for="t in templates" :key="t.templateId" class="template-card" @click="openEditor(t)">
          <div class="template-name">{{ t.name }}</div>
          <div class="template-meta">{{ presetLabel(t.presetKey) }} · {{ t.pageFormat }} · {{ t.orientation === 'landscape' ? 'Quer' : 'Hoch' }}</div>
          <div class="template-actions">
            <button class="icon-btn" title="Bearbeiten" @click.stop="openEditor(t)"><i class="ti ti-edit"></i></button>
            <button class="icon-btn danger" title="Löschen" @click.stop="deleteTemplate(t)"><i class="ti ti-trash"></i></button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── PRESET-GALERIE ── -->
    <template v-else-if="mode === 'presets'">
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Layout wählen — der Rahmen (Seitenformat, Logo-/Preis-Zone) ist danach fest, der Inhaltsbereich bleibt frei editierbar.</p>
      <div class="preset-gallery">
        <button v-for="p in presets" :key="p.key" class="preset-card" @click="startNewFromPreset(p)">
          <div class="preset-name">{{ p.label }}</div>
          <div class="preset-desc">{{ p.description }}</div>
        </button>
      </div>
    </template>

    <!-- ── EDITOR ── -->
    <template v-else-if="mode === 'editor'">
      <div class="draft-meta-row">
        <input v-model="draft.name" class="draft-name-input" placeholder="Name der Vorlage, z.B. „Schaufenster groß“" />
        <select v-model="draft.pageFormat" class="draft-select">
          <option value="A4">A4</option>
          <option value="A5">A5</option>
          <option value="A6">A6</option>
        </select>
        <select v-model="draft.orientation" class="draft-select">
          <option value="portrait">Hochformat</option>
          <option value="landscape">Querformat</option>
        </select>
        <select v-model="previewVehicleId" class="draft-select" @change="onPreviewVehicleChange">
          <option value="">Beispiel-Fahrzeug (BMW 3er)</option>
          <option v-for="v in vehicles" :key="v.vehicleId" :value="v.vehicleId">{{ v.make }} {{ v.model }} {{ v.variant || '' }}</option>
        </select>
      </div>

      <div class="editor-grid">
        <div class="editor-col">
          <PriceTagEditor v-model="draft.contentHtml" style="flex:1;min-height:420px" />
        </div>

        <div class="preview-col">
          <div class="preview-toolbar">
            <div class="preview-tabs">
              <button class="preview-tab" :class="{ active: previewMode === 'html' }" @click="previewMode = 'html'">
                <i class="ti ti-bolt"></i> Live-Vorschau
              </button>
              <button class="preview-tab" :class="{ active: previewMode === 'pdf' }" @click="showPdfPreview">
                <i class="ti ti-file-type-pdf"></i> PDF-Vorschau
              </button>
            </div>
            <button v-if="previewMode === 'pdf'" class="icon-btn" title="PDF neu rendern" :disabled="pdfLoading" @click="showPdfPreview">
              <i class="ti" :class="pdfLoading ? 'ti-loader-2 spin' : 'ti-refresh'"></i>
            </button>
          </div>

          <div class="preview-frame-wrap">
            <iframe v-if="previewMode === 'html'" :srcdoc="htmlPreview" class="preview-frame" title="Live-Vorschau"></iframe>
            <div v-else class="pdf-preview-wrap">
              <div v-if="pdfLoading" class="loading-state"><i class="ti ti-loader-2 spin"></i></div>
              <div v-else-if="pdfError" class="pdf-error"><i class="ti ti-alert-triangle"></i> {{ pdfError }}</div>
              <iframe v-else-if="pdfUrl" :src="pdfUrl" class="preview-frame" title="PDF-Vorschau"></iframe>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import PriceTagEditor from '~/components/automotive/PriceTagEditor.vue'
import { buildVehicleTemplateDataClient, renderVehiclePriceTagHtmlClient, getSampleVehicleClient } from '~/utils/vehiclePriceTagTemplateClient'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { useAuthHeader } = await import('~/composables/useAuth')

type Mode = 'list' | 'presets' | 'editor'
const mode    = ref<Mode>('list')
const loading = ref(true)
const saving  = ref(false)
const savedAt = ref('')

const templates = ref<any[]>([])
const presets    = ref<Array<{ key: string; label: string; description: string; frameHtml: string; startContentHtml: string }>>([])
const companySettings  = ref<any>({})
const brandingSettings = ref<any>({})
const vehicles = ref<any[]>([])
const previewVehicleId = ref('')

const editingId = ref('')
const draft = reactive({ name: '', presetKey: 'klassisch', contentHtml: '', pageFormat: 'A5', orientation: 'portrait' as 'portrait' | 'landscape' })

function selectedVehicle() {
  return vehicles.value.find(v => v.vehicleId === previewVehicleId.value) || null
}

function onPreviewVehicleChange() {
  const v = selectedVehicle()
  if (v && !draft.name.trim()) draft.name = `Preisschild – ${v.make} ${v.model}`.trim()
  updateHtmlPreview()
}

const previewMode = ref<'html' | 'pdf'>('html')
const htmlPreview  = ref('')
const pdfLoading   = ref(false)
const pdfError     = ref('')
const pdfUrl       = ref('')

function presetLabel(key: string) {
  return presets.value.find(p => p.key === key)?.label || key
}
function frameFor(key: string) {
  return presets.value.find(p => p.key === key)?.frameHtml || presets.value[0]?.frameHtml || ''
}

function startNewFromPreset(p: { key: string; startContentHtml: string }) {
  editingId.value = ''
  draft.name = ''
  draft.presetKey = p.key
  draft.contentHtml = p.startContentHtml
  draft.pageFormat = 'A5'
  draft.orientation = 'portrait'
  previewVehicleId.value = ''
  mode.value = 'editor'
  updateHtmlPreview()
}

function openEditor(t: any) {
  editingId.value = t.templateId
  draft.name = t.name
  draft.presetKey = t.presetKey
  draft.contentHtml = t.contentHtml
  draft.pageFormat = t.pageFormat || 'A5'
  draft.orientation = t.orientation || 'portrait'
  previewVehicleId.value = ''
  mode.value = 'editor'
  updateHtmlPreview()
}

let previewDebounce: ReturnType<typeof setTimeout> | null = null
function updateHtmlPreview() {
  const data = buildVehicleTemplateDataClient(selectedVehicle() || getSampleVehicleClient(), brandingSettings.value, companySettings.value)
  htmlPreview.value = renderVehiclePriceTagHtmlClient(frameFor(draft.presetKey), draft.contentHtml, data)
}
watch(() => [draft.contentHtml, draft.presetKey], () => {
  if (previewDebounce) clearTimeout(previewDebounce)
  previewDebounce = setTimeout(updateHtmlPreview, 250)
})

async function showPdfPreview() {
  previewMode.value = 'pdf'
  pdfLoading.value = true
  pdfError.value = ''
  try {
    const res = await fetch(useApiUrl('/api/automotive/pricetag-templates/render'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await useAuthHeader()) },
      body: JSON.stringify({
        presetKey: draft.presetKey, contentHtml: draft.contentHtml,
        pageFormat: draft.pageFormat, orientation: draft.orientation,
        vehicleId: previewVehicleId.value || undefined,
      }),
    })
    if (!res.ok) throw new Error(`Rendern fehlgeschlagen (${res.status})`)
    const blob = await res.blob()
    if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = URL.createObjectURL(blob)
  } catch (e: any) {
    pdfError.value = e?.message || 'PDF konnte nicht gerendert werden'
  } finally {
    pdfLoading.value = false
  }
}

async function loadTemplates() {
  const r = await $fetch<any>(useApiUrl('/api/automotive/pricetag-templates'), { headers: await useAuthHeader() })
  templates.value = r?.templates || []
}

async function saveTemplate() {
  saving.value = true
  try {
    const body = {
      name: draft.name.trim(), presetKey: draft.presetKey, contentHtml: draft.contentHtml,
      pageFormat: draft.pageFormat, orientation: draft.orientation,
    }
    if (editingId.value) {
      await $fetch(useApiUrl(`/api/automotive/pricetag-templates/${editingId.value}`), { method: 'PATCH', headers: await useAuthHeader(), body })
    } else {
      await $fetch(useApiUrl('/api/automotive/pricetag-templates'), { method: 'POST', headers: await useAuthHeader(), body })
    }
    savedAt.value = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    await loadTemplates()
    mode.value = 'list'
  } finally {
    saving.value = false
  }
}

async function deleteTemplate(t: any) {
  if (!confirm(`Vorlage „${t.name}“ wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/automotive/pricetag-templates/${t.templateId}`), { method: 'DELETE', headers: await useAuthHeader() })
  await loadTemplates()
}

onMounted(async () => {
  try {
    const authHeaders = await useAuthHeader()
    const [tplRes, presetsRes, companyRes, brandingRes, vehiclesRes] = await Promise.all([
      $fetch<any>(useApiUrl('/api/automotive/pricetag-templates'), { headers: authHeaders }),
      $fetch<any>(useApiUrl('/api/automotive/pricetag-templates/presets')),
      $fetch<any>(useApiUrl('/api/settings/company'), { headers: authHeaders }),
      $fetch<any>(useApiUrl('/api/settings/branding'), { headers: authHeaders }),
      $fetch<any>(useApiUrl('/api/automotive'), { headers: authHeaders }),
    ])
    templates.value = tplRes?.templates || []
    presets.value = presetsRes?.presets || []
    companySettings.value = companyRes?.company || {}
    brandingSettings.value = brandingRes?.branding || {}
    vehicles.value = vehiclesRes?.vehicles || []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.title { font-size: 22px; font-weight: 800; margin: 0; }
.subtitle { color: var(--text-muted); font-size: 13px; margin: 4px 0 0; }
.header-actions { display: flex; align-items: center; gap: 12px; }
.saved-hint { font-size: 12px; color: #22c55e; display: flex; align-items: center; gap: 4px; }

.loading-state { display: flex; justify-content: center; padding: 60px; color: var(--text-muted); font-size: 28px; }

.template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.template-card { background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 14px; padding: 16px; cursor: pointer; transition: border-color .15s; }
.template-card:hover { border-color: var(--accent); }
.template-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
.template-meta { font-size: 11px; color: var(--text-muted); margin-bottom: 12px; }
.template-actions { display: flex; gap: 6px; }
.template-actions .icon-btn.danger:hover { color: #ef4444; background: rgba(239,68,68,.1); }

.preset-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.preset-card { text-align: left; background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 12px; padding: 16px; cursor: pointer; transition: border-color .15s; color: var(--text); font: inherit; }
.preset-card:hover { border-color: var(--accent); }
.preset-name { font-weight: 700; font-size: 14px; margin-bottom: 6px; color: var(--text); }
.preset-desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

.draft-meta-row { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.draft-name-input { flex: 1; min-width: 220px; background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 8px; padding: 8px 12px; color: var(--text); font-size: 13px; }
.draft-select { background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 8px; padding: 8px 12px; color: var(--text); font-size: 13px; }

.editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: stretch; }
@media (max-width: 1100px) { .editor-grid { grid-template-columns: 1fr; } }

.editor-col, .preview-col { display: flex; flex-direction: column; background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 16px; overflow: hidden; min-height: 620px; }

.preview-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 0.5px solid var(--border); }
.preview-tabs { display: flex; gap: 6px; }
.preview-tab { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 5px 10px; border-radius: 7px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; }
.preview-tab.active { background: var(--bg-elevated); color: var(--text); font-weight: 600; }

.preview-frame-wrap { flex: 1; padding: 10px; }
.preview-frame { width: 100%; height: 100%; min-height: 560px; border: none; border-radius: 8px; background: #fff; }
.pdf-preview-wrap { height: 100%; min-height: 560px; }
.pdf-error { display: flex; align-items: center; gap: 8px; color: #ef4444; padding: 40px; justify-content: center; font-size: 13px; }
</style>
