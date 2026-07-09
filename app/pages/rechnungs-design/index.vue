<template>
  <div class="page">
    <div class="header-row">
      <div>
        <h1 class="title">Rechnungs-<span style="color:var(--accent)">Design</span></h1>
        <p class="subtitle">Gestalte das Layout deiner Rechnungen — Vorlage wählen, anpassen, live prüfen.</p>
      </div>
      <div class="header-actions">
        <span v-if="savedAt" class="saved-hint"><i class="ti ti-check"></i> Gespeichert {{ savedAt }}</span>
        <button class="accent-btn" :disabled="saving || loading" @click="saveTemplate">
          <i class="ti" :class="saving ? 'ti-loader-2 spin' : 'ti-device-floppy'"></i> Speichern
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state"><i class="ti ti-loader-2 spin"></i></div>

    <template v-else>
      <!-- Preset-Galerie -->
      <div class="preset-gallery">
        <button
          v-for="p in presets" :key="p.key"
          class="preset-card" :class="{ active: activePreset === p.key }"
          @click="applyPreset(p)">
          <div class="preset-name">{{ p.label }}</div>
          <div class="preset-desc">{{ p.description }}</div>
        </button>
      </div>

      <div class="editor-grid">
        <!-- Linke Spalte: Monaco + Platzhalter-Referenz -->
        <div class="editor-col">
          <div class="editor-toolbar">
            <span class="editor-toolbar-label"><i class="ti ti-code"></i> HTML / CSS Template</span>
            <select v-model="monacoTheme" class="theme-select" @change="setMonacoTheme(monacoTheme)">
              <option v-for="t in monacoThemes" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <ClientOnly>
            <VueMonacoEditor
              v-model:value="templateHtml"
              language="html"
              :theme="monacoTheme"
              :options="{
                fontSize: 13,
                lineHeight: 22,
                minimap: { enabled: false },
                wordWrap: 'on',
                tabSize: 2,
                scrollBeyondLastLine: false,
                fontFamily: '\'JetBrains Mono\', \'Fira Code\', monospace',
                padding: { top: 16, bottom: 16 },
              }"
              style="flex:1;min-height:420px"
              @mount="onMonacoMount"
            />
            <template #fallback>
              <div class="monaco-fallback"><i class="ti ti-loader-2 spin"></i></div>
            </template>
          </ClientOnly>

          <div class="placeholder-panel">
            <div class="placeholder-heading"><i class="ti ti-variable"></i> Platzhalter (Klick fügt an der Cursor-Position ein)</div>
            <div class="placeholder-groups">
              <div v-for="group in PLACEHOLDER_GROUPS" :key="group.label" class="placeholder-group">
                <div class="placeholder-group-label">{{ group.label }}</div>
                <div class="placeholder-chips">
                  <button v-for="ph in group.items" :key="ph" class="placeholder-chip" @click="insertPlaceholder(ph)">{{ ph }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rechte Spalte: Vorschau -->
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
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import { buildTemplateDataClient, renderInvoiceHtmlClient, getSampleInvoice } from '~/utils/invoiceTemplateClient'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { useAuthHeader } = await import('~/composables/useAuth')

const loading  = ref(true)
const saving   = ref(false)
const savedAt  = ref('')
const templateHtml  = ref('')
const activePreset  = ref('standard')
const presets  = ref<Array<{ key: string; label: string; description: string; html: string }>>([])

const previewMode = ref<'html' | 'pdf'>('html')
const htmlPreview  = ref('')
const pdfLoading   = ref(false)
const pdfError     = ref('')
const pdfUrl       = ref('')

const companySettings  = ref<any>({})
const brandingSettings = ref<any>({})
const invoiceSettingsData = ref<any>({})

const monacoTheme  = ref(import.meta.client ? (localStorage.getItem('plx_editor_theme') || 'vs-dark') : 'vs-dark')
const monacoThemes = [
  { value: 'vs-dark',  label: 'VS Dark' },
  { value: 'vs',       label: 'VS Light' },
  { value: 'hc-black', label: 'High Contrast Dark' },
  { value: 'hc-light', label: 'High Contrast Light' },
]
function setMonacoTheme(v: string) {
  localStorage.setItem('plx_editor_theme', v)
}

const PLACEHOLDER_GROUPS = [
  { label: 'Firma',    items: ['{{firma.name}}', '{{firma.strasse}}', '{{firma.plz_ort}}', '{{firma.email}}', '{{firma.telefon}}', '{{firma.ustid}}', '{{firma.iban}}', '{{firma.bic}}', '{{firma.bankname}}'] },
  { label: 'Kunde',     items: ['{{kunde.name}}', '{{kunde.adresse}}', '{{kunde.email}}'] },
  { label: 'Rechnung',  items: ['{{rechnung.nummer}}', '{{rechnung.datum}}', '{{rechnung.faelligkeit}}', '{{rechnung.kundennummer}}'] },
  { label: 'Positionen', items: ['{{positionen}}', '{{#each positionenListe}}...{{/each}}'] },
  { label: 'Summen',    items: ['{{summe.netto}}', '{{summe.mwst}}', '{{summe.mwst_satz}}', '{{summe.brutto}}'] },
  { label: 'Branding',  items: ['{{branding.farbe}}', '{{branding.firmenname}}', '{{branding.slogan}}', '{{branding.logo}}'] },
  { label: 'QR-Code & Zahlung', items: ['{{qr_code}}', '{{qr_code_online}}', '{{zahllink}}'] },
]

let monacoEditorRef: any = null
function onMonacoMount(editor: any) {
  monacoEditorRef = editor
}
function insertPlaceholder(text: string) {
  if (!monacoEditorRef) { templateHtml.value += text; return }
  const selection = monacoEditorRef.getSelection()
  monacoEditorRef.executeEdits('placeholder-insert', [{ range: selection, text, forceMoveMarkers: true }])
  monacoEditorRef.focus()
}

function applyPreset(p: { key: string; html: string }) {
  templateHtml.value = p.html
  activePreset.value = p.key
}

let previewDebounce: ReturnType<typeof setTimeout> | null = null
async function updateHtmlPreview() {
  const data = await buildTemplateDataClient(getSampleInvoice(), brandingSettings.value, companySettings.value, invoiceSettingsData.value)
  htmlPreview.value = renderInvoiceHtmlClient(templateHtml.value, data)
}
watch(templateHtml, () => {
  if (previewDebounce) clearTimeout(previewDebounce)
  previewDebounce = setTimeout(updateHtmlPreview, 250)
})

async function showPdfPreview() {
  previewMode.value = 'pdf'
  pdfLoading.value = true
  pdfError.value = ''
  try {
    const res = await fetch(useApiUrl('/api/settings/invoice-template/render'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await useAuthHeader()) },
      body: JSON.stringify({ html: templateHtml.value }),
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

async function saveTemplate() {
  saving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/invoice-template'), {
      method: 'PUT',
      headers: await useAuthHeader(),
      body: { html: templateHtml.value, presetKey: activePreset.value },
    })
    savedAt.value = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const authHeaders = await useAuthHeader()
    const [tplRes, presetsRes, companyRes, brandingRes, invoiceRes] = await Promise.all([
      $fetch<any>(useApiUrl('/api/settings/invoice-template'), { headers: authHeaders }),
      $fetch<any>(useApiUrl('/api/settings/invoice-presets')),
      $fetch<any>(useApiUrl('/api/settings/company'), { headers: authHeaders }),
      $fetch<any>(useApiUrl('/api/settings/branding'), { headers: authHeaders }),
      $fetch<any>(useApiUrl('/api/settings/invoice'), { headers: authHeaders }),
    ])
    presets.value = presetsRes?.presets || []
    templateHtml.value = tplRes?.template?.html || presets.value.find(p => p.key === 'standard')?.html || ''
    activePreset.value = tplRes?.template?.presetKey || 'standard'
    companySettings.value = companyRes?.company || {}
    brandingSettings.value = brandingRes?.branding || {}
    invoiceSettingsData.value = invoiceRes?.settings || {}
    await updateHtmlPreview()
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

.preset-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 18px; }
.preset-card { text-align: left; background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: border-color .15s; }
.preset-card:hover { border-color: var(--accent); }
.preset-card.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface)); }
.preset-name { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
.preset-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; }

.editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: stretch; }
@media (max-width: 1100px) { .editor-grid { grid-template-columns: 1fr; } }

.editor-col, .preview-col { display: flex; flex-direction: column; background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 16px; overflow: hidden; min-height: 620px; }

.editor-toolbar, .preview-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 0.5px solid var(--border); }
.editor-toolbar-label { font-size: 12px; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.theme-select { background: var(--bg-elevated); border: 0.5px solid var(--border); border-radius: 6px; color: var(--text); font-size: 12px; padding: 4px 8px; }

.monaco-fallback { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 24px; min-height: 420px; }

.placeholder-panel { border-top: 0.5px solid var(--border); padding: 12px 14px; max-height: 200px; overflow-y: auto; }
.placeholder-heading { font-size: 11px; font-weight: 700; color: var(--text-muted); display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.placeholder-groups { display: flex; flex-direction: column; gap: 8px; }
.placeholder-group-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px; }
.placeholder-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.placeholder-chip { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; background: var(--bg-elevated); border: 0.5px solid var(--border); border-radius: 5px; padding: 3px 7px; cursor: pointer; color: var(--accent); }
.placeholder-chip:hover { border-color: var(--accent); }

.preview-tabs { display: flex; gap: 6px; }
.preview-tab { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 5px 10px; border-radius: 7px; border: none; background: transparent; color: var(--text-muted); cursor: pointer; }
.preview-tab.active { background: var(--bg-elevated); color: var(--text); font-weight: 600; }

.preview-frame-wrap { flex: 1; padding: 10px; }
.preview-frame { width: 100%; height: 100%; min-height: 560px; border: none; border-radius: 8px; background: #fff; }
.pdf-preview-wrap { height: 100%; min-height: 560px; }
.pdf-error { display: flex; align-items: center; gap: 8px; color: #ef4444; padding: 40px; justify-content: center; font-size: 13px; }
</style>
