<template>
  <div class="page">
    <div class="header-row">
      <div>
        <h1 class="title">{{ type === 'job' ? 'Stellenanzeige-' : 'Kampagnen-' }}<span style="color:var(--accent)">Design</span></h1>
        <p class="subtitle">{{ campaignLabel }} — Vorlage wählen, anpassen, live prüfen.</p>
      </div>
      <div class="header-actions">
        <span v-if="savedAt" class="saved-hint"><i class="ti ti-check"></i> Gespeichert {{ savedAt }}</span>
        <NuxtLink :to="backLink" class="ghost-btn"><i class="ti ti-arrow-left"></i> Zurück</NuxtLink>
        <button class="accent-btn" :disabled="saving || loading" @click="saveTemplate">
          <i class="ti" :class="saving ? 'ti-loader-2 spin' : 'ti-device-floppy'"></i> Speichern
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state"><i class="ti ti-loader-2 spin"></i></div>
    <div v-else-if="loadError" class="pdf-error"><i class="ti ti-alert-triangle"></i> {{ loadError }}</div>

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

      <!-- Modus-Umschalter -->
      <div class="mode-switch">
        <button class="mode-btn" :class="{ active: mode === 'code' }" @click="mode = 'code'"><i class="ti ti-code"></i> Code</button>
        <button class="mode-btn" :class="{ active: mode === 'visual' }" @click="mode = 'visual'"><i class="ti ti-hand-click"></i> Visuell</button>
      </div>

      <!-- Visuell-Toolbar: Farben + Typ (nicht per Klick in der Vorschau editierbar) -->
      <div v-if="mode === 'visual'" class="visual-toolbar">
        <div class="visual-toolbar-item">
          <label>Akzentfarbe</label>
          <input type="color" v-model="campaign.accentColor" @change="preserveScrollThenRerender" />
        </div>
        <div class="visual-toolbar-item">
          <label>Hintergrundfarbe</label>
          <input type="color" v-model="campaign.bgColor" @change="preserveScrollThenRerender" />
        </div>
        <div v-if="type === 'job'" class="visual-toolbar-item">
          <label>Anstellungsart</label>
          <select v-model="campaign.type" class="theme-select" @change="preserveScrollThenRerender">
            <option v-for="(label, key) in JOB_TYPE_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>
        <div class="visual-toolbar-divider"></div>
        <button class="toolbar-image-btn" @click="openImageModal('campaign.logoUrl')"><i class="ti ti-photo"></i> Logo</button>
        <button class="toolbar-image-btn" @click="openImageModal('campaign.headerImageUrl')"><i class="ti ti-photo"></i> Header-Bild</button>
        <button v-if="type === 'lead'" class="toolbar-image-btn" @click="openImageModal('campaign.bgImageUrl')"><i class="ti ti-photo"></i> Hintergrundbild</button>
        <div class="visual-toolbar-hint"><i class="ti ti-info-circle"></i> Text in der Vorschau anklicken zum Bearbeiten</div>
      </div>

      <div class="editor-grid" :class="{ 'visual-mode': mode === 'visual' }">
        <!-- Linke Spalte: Monaco + Platzhalter-Referenz (nur im Code-Modus) -->
        <div v-if="mode === 'code'" class="editor-col">
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
              <div v-for="group in placeholderGroups" :key="group.label" class="placeholder-group">
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
              <span class="preview-tab active"><i class="ti ti-bolt"></i> Live-Vorschau</span>
            </div>
          </div>
          <div class="preview-frame-wrap">
            <iframe ref="previewIframeRef" :srcdoc="iframeSrcdoc" class="preview-frame" title="Live-Vorschau" @load="onIframeLoad"></iframe>
          </div>
        </div>
      </div>
    </template>

    <!-- Mehrzeiliges Textfeld bearbeiten -->
    <div v-if="multilineModal.open" class="modal-overlay" @click.self="multilineModal.open = false">
      <div class="modal-card" style="max-width:520px;width:92vw">
        <div class="modal-header">
          <span class="card-title">{{ multilineModal.label }}</span>
          <button class="icon-btn" @click="multilineModal.open = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <textarea v-model="multilineModal.value" rows="8" class="visual-textarea"></textarea>
          <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
            <button class="icon-btn" @click="multilineModal.open = false">Abbrechen</button>
            <button class="accent-btn" @click="saveMultilineModal">Übernehmen</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Bild bearbeiten -->
    <div v-if="imageModal.open" class="modal-overlay" @click.self="closeImageModal">
      <div class="modal-card" style="max-width:520px;width:92vw">
        <div class="modal-header">
          <span class="card-title">{{ imageModal.label }}</span>
          <button class="icon-btn" @click="closeImageModal"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <ImageUploadCrop :model-value="campaign[imageModal.field] || ''" s3-prefix="campaigns/" @update:model-value="onImageModalUpdate" />
          <div v-if="campaign[imageModal.field] && imageModalFieldType === 'image'" class="image-size-row">
            <div class="image-size-label">Bildgröße</div>
            <div class="image-size-buttons">
              <button v-for="pct in [25, 50, 75, 100]" :key="pct" class="image-size-btn"
                :class="{ active: currentImageWidthPct === pct }" @click="setImageWidthPct(pct)">
                {{ pct === 100 ? 'Volle Breite' : pct + '%' }}
              </button>
            </div>
          </div>
          <div v-else-if="campaign[imageModal.field] && imageModalFieldType === 'image-bg'" class="image-size-row">
            <div class="image-size-hint"><i class="ti ti-info-circle"></i> Füllt in diesem Layout automatisch die volle Breite seines Bereichs — keine Größenwahl nötig.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import {
  buildLeadTemplateDataClient, buildJobTemplateDataClient, renderCampaignHtmlClient,
  markEditableFields, VISUAL_MODE_STYLE, VISUAL_MODE_SCRIPT, JOB_TYPE_LABELS,
} from '~/utils/campaignTemplateClient'

const props = defineProps<{ type: 'lead' | 'job'; campaignId: string }>()

const { useAuthHeader } = await import('~/composables/useAuth')

const loading   = ref(true)
const loadError = ref('')
const saving    = ref(false)
const savedAt   = ref('')
const templateHtml = ref('')
const activePreset = ref('standard')
const presets = ref<Array<{ key: string; label: string; description: string; html: string }>>([])

const htmlPreview = ref('')

const campaign  = ref<any>({})
const linkedForm = ref<any>(null)
const branding  = ref<any>({})

const campaignLabel = computed(() => props.type === 'job'
  ? (campaign.value?.title || 'Stellenausschreibung')
  : (campaign.value?.name || campaign.value?.headline || 'Kampagne'))

const backLink = computed(() => props.type === 'job' ? '/hr' : '/marketing')

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

const LEAD_PLACEHOLDER_GROUPS = [
  { label: 'Kampagne', items: ['{{campaign.headline}}', '{{campaign.subtext}}', '{{campaign.accentColor}}', '{{campaign.logoUrl}}', '{{campaign.headerImageUrl}}', '{{campaign.bgImageUrl}}', '{{campaign.bgColor}}'] },
  { label: 'Vorteile', items: ['{{campaign.contentTitle}}', '{{#each campaign.contentItems}}...{{/each}}'] },
  { label: 'Formular', items: ['{{{form_html}}}', '{{form.title}}', '{{form.description}}'] },
  { label: 'Branding', items: ['{{branding.brandName}}', '{{branding.brandNameFirst}}', '{{branding.brandNameLast}}', '{{branding.brandTagline}}', '{{branding.logoUrl}}'] },
]
const JOB_PLACEHOLDER_GROUPS = [
  { label: 'Stelle', items: ['{{campaign.title}}', '{{campaign.department}}', '{{campaign.location}}', '{{campaign.typeLabel}}', '{{campaign.description}}', '{{campaign.requirements}}'] },
  { label: 'Unternehmen', items: ['{{campaign.companyName}}', '{{campaign.accentColor}}', '{{campaign.logoUrl}}', '{{campaign.headerImageUrl}}'] },
  { label: 'Bewerbungsformular', items: ['{{{application_form_html}}}'] },
  { label: 'Branding', items: ['{{branding.brandName}}', '{{branding.brandNameFirst}}', '{{branding.brandNameLast}}'] },
]
const placeholderGroups = computed(() => props.type === 'job' ? JOB_PLACEHOLDER_GROUPS : LEAD_PLACEHOLDER_GROUPS)

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

function updatePreview() {
  const data = props.type === 'job'
    ? buildJobTemplateDataClient(campaign.value, branding.value)
    : buildLeadTemplateDataClient(campaign.value, linkedForm.value, branding.value)
  const rendered = renderCampaignHtmlClient(templateHtml.value, data)
  htmlPreview.value = mode.value === 'visual' ? markEditableFields(rendered) : rendered
}

let previewDebounce: ReturnType<typeof setTimeout> | null = null
watch(templateHtml, () => {
  if (previewDebounce) clearTimeout(previewDebounce)
  previewDebounce = setTimeout(updatePreview, 250)
})

// ── Visueller Bearbeitungsmodus ──────────────────────────────────────────────
const mode = ref<'code' | 'visual'>('code')
watch(mode, updatePreview)

const previewIframeRef = ref<HTMLIFrameElement | null>(null)
let pendingScrollY: number | null = null

function preserveScrollThenRerender() {
  pendingScrollY = previewIframeRef.value?.contentWindow?.scrollY ?? null
  updatePreview()
}
function onIframeLoad() {
  if (pendingScrollY !== null) {
    previewIframeRef.value?.contentWindow?.scrollTo(0, pendingScrollY)
    pendingScrollY = null
  }
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Titel', headline: 'Headline', subtext: 'Subtext', description: 'Beschreibung',
  requirements: 'Anforderungen', department: 'Abteilung', location: 'Standort',
  companyName: 'Firmenname', contentTitle: 'Block-Titel',
  logoUrl: 'Logo', headerImageUrl: 'Header-Bild', bgImageUrl: 'Hintergrundbild',
}
function fieldKey(field: string) { return field.replace(/^campaign\./, '') }

const multilineModal = reactive({ open: false, field: '', label: '', value: '' })
function openMultilineModal(field: string) {
  const key = fieldKey(field)
  multilineModal.field = key
  multilineModal.label  = FIELD_LABELS[key] || key
  multilineModal.value  = campaign.value[key] || ''
  multilineModal.open   = true
}
function saveMultilineModal() {
  campaign.value[multilineModal.field] = multilineModal.value
  multilineModal.open = false
  preserveScrollThenRerender()
}

const imageModal = reactive({ open: false, field: '', label: '' })
function openImageModal(field: string) {
  const key = fieldKey(field)
  imageModal.field = key
  imageModal.label  = FIELD_LABELS[key] || key
  imageModal.open   = true
}
function closeImageModal() { imageModal.open = false }
// Ob ein Bildfeld im AKTUELL gewählten Preset als frei zuschneidbares <img> (Größe wählbar) oder
// als volldeckender Hintergrund (immer 100%, keine Größenwahl sinnvoll) gerendert wird, hängt vom
// Preset ab — nicht statisch bekannt, da derselbe Toolbar-Button ("Header-Bild") je nach Preset
// beides treffen kann. Deshalb aus dem aktuellen Template-Quelltext ermittelt statt hartkodiert.
const imageModalFieldType = computed(() => {
  const re = new RegExp(`data-plx-field="campaign\\.${imageModal.field}"\\s+data-plx-type="([a-z-]+)"`)
  return templateHtml.value.match(re)?.[1] || null
})
const currentImageWidthPct = computed(() => campaign.value.imageStyles?.[imageModal.field]?.widthPct ?? null)
function setImageWidthPct(pct: number) {
  if (!campaign.value.imageStyles) campaign.value.imageStyles = {}
  campaign.value.imageStyles[imageModal.field] = { widthPct: pct }
  preserveScrollThenRerender()
}
function onImageModalUpdate(url: string) {
  campaign.value[imageModal.field] = url
  preserveScrollThenRerender()
}

function handleIframeMessage(event: MessageEvent) {
  if (event.source !== previewIframeRef.value?.contentWindow) return
  const data = event.data
  if (!data || data.source !== 'plx-visual-editor') return
  if (data.type === 'plx-text-edit') {
    campaign.value[fieldKey(data.field)] = data.value
    preserveScrollThenRerender()
  } else if (data.type === 'plx-field-click') {
    if (data.fieldType === 'multiline') openMultilineModal(data.field)
    else if (data.fieldType === 'image' || data.fieldType === 'image-bg') openImageModal(data.field)
  }
}
onMounted(() => window.addEventListener('message', handleIframeMessage))
onUnmounted(() => window.removeEventListener('message', handleIframeMessage))

const iframeSrcdoc = computed(() => `<!doctype html><html><head><meta charset="utf-8" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css" />
  <style>body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}${mode.value === 'visual' ? VISUAL_MODE_STYLE : ''}</style>
  </head><body>${htmlPreview.value}${mode.value === 'visual' ? `<script>${VISUAL_MODE_SCRIPT}<\/script>` : ''}</body></html>`)

async function saveTemplate() {
  saving.value = true
  try {
    const authHeaders = await useAuthHeader()
    const url = props.type === 'job' ? `/api/hr/campaigns/${props.campaignId}` : `/api/marketing/${props.campaignId}`
    await $fetch(useApiUrl(url), {
      method: 'PATCH',
      headers: authHeaders,
      body: { ...campaign.value, customTemplateHtml: templateHtml.value, templatePresetKey: activePreset.value },
    })
    campaign.value.customTemplateHtml = templateHtml.value
    campaign.value.templatePresetKey  = activePreset.value
    savedAt.value = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const authHeaders = await useAuthHeader()
    const [dataRes, presetsRes, brandingRes] = await Promise.all([
      $fetch<any>(useApiUrl(props.type === 'job' ? `/api/hr/campaigns/${props.campaignId}` : `/api/marketing/${props.campaignId}`), { headers: authHeaders }),
      $fetch<any>(useApiUrl(`/api/campaigns/presets?type=${props.type}`)),
      $fetch<any>(useApiUrl('/api/settings/branding'), { headers: authHeaders }),
    ])
    campaign.value   = dataRes?.campaign || {}
    linkedForm.value = dataRes?.form || null
    branding.value   = brandingRes?.branding || {}
    presets.value    = presetsRes?.presets || []
    templateHtml.value = campaign.value.customTemplateHtml || presets.value.find(p => p.key === 'standard')?.html || ''
    activePreset.value = campaign.value.templatePresetKey || 'standard'
    updatePreview()
  } catch (e: any) {
    loadError.value = e?.data?.message || e?.message || 'Konnte Kampagne nicht laden'
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
.ghost-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); text-decoration: none; padding: 8px 12px; border-radius: 8px; border: 0.5px solid var(--border); }
.ghost-btn:hover { color: var(--text); border-color: var(--accent); }

.loading-state { display: flex; justify-content: center; padding: 60px; color: var(--text-muted); font-size: 28px; }

.preset-gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 18px; }
.preset-card { text-align: left; background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 12px; padding: 12px 14px; cursor: pointer; transition: border-color .15s; }
.preset-card:hover { border-color: var(--accent); }
.preset-card.active { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface)); }
.preset-name { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
.preset-desc { font-size: 11px; color: var(--text-muted); line-height: 1.4; }

.mode-switch { display: flex; gap: 6px; margin-bottom: 14px; background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 10px; padding: 4px; width: fit-content; }
.mode-btn { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 7px 14px; border: none; border-radius: 7px; background: transparent; color: var(--text-muted); cursor: pointer; }
.mode-btn.active { background: var(--accent); color: #fff; }

.visual-toolbar { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; background: var(--bg-surface); border: 0.5px solid var(--border); border-radius: 12px; padding: 12px 16px; margin-bottom: 14px; }
.visual-toolbar-item { display: flex; align-items: center; gap: 8px; }
.visual-toolbar-item label { font-size: 12px; font-weight: 600; color: var(--text-muted); }
.visual-toolbar-item input[type="color"] { width: 32px; height: 32px; border-radius: 7px; border: 0.5px solid var(--border); background: none; cursor: pointer; }
.visual-toolbar-hint { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); margin-left: auto; }
.visual-toolbar-divider { width: 1px; align-self: stretch; background: var(--border); }
.toolbar-image-btn { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; padding: 8px 12px; border-radius: 8px; border: 0.5px solid var(--border); background: var(--bg-elevated); color: var(--text-primary); cursor: pointer; }
.toolbar-image-btn:hover { border-color: var(--accent); color: var(--accent); }

.image-size-row { margin-top: 16px; padding-top: 16px; border-top: 0.5px solid var(--border); }
.image-size-label { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; }
.image-size-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
.image-size-btn { font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 7px; border: 0.5px solid var(--border); background: var(--bg-elevated); color: var(--text-primary); cursor: pointer; }
.image-size-btn:hover { border-color: var(--accent); }
.image-size-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
.image-size-hint { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }

.visual-textarea { width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: 8px; border: 0.5px solid var(--border); background: var(--bg-elevated); color: var(--text-primary); font-family: inherit; font-size: 14px; resize: vertical; }

.editor-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: stretch; }
.editor-grid.visual-mode { grid-template-columns: 1fr; }
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
.preview-tab { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 5px 10px; border-radius: 7px; background: transparent; color: var(--text-muted); }
.preview-tab.active { background: var(--bg-elevated); color: var(--text); font-weight: 600; }

.preview-frame-wrap { flex: 1; padding: 10px; }
.preview-frame { width: 100%; height: 100%; min-height: 560px; border: none; border-radius: 8px; background: #fff; }
.pdf-error { display: flex; align-items: center; gap: 8px; color: #ef4444; padding: 40px; justify-content: center; font-size: 13px; }
</style>
