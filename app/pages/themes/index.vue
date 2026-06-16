<template>
  <div class="page">

    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-palette" style="margin-right:8px;color:var(--accent)"></i>Frontend-Themes</span>
      </div>
      <div class="card-body" style="font-size:13px;color:var(--text-secondary)">
        Gestalte hier das Erscheinungsbild deiner öffentlichen Seiten (Startseite, Pagebuilder-Seiten, Shop, Login).
        Das Dashboard bleibt davon unberührt.
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:14px">

      <!-- EDITOR -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Editor</span>
          <div style="display:flex;gap:6px">
            <button class="icon-btn" title="Dark-Defaults laden" @click="loadPreset('dark')"><i class="ti ti-moon"></i></button>
            <button class="icon-btn" title="Light-Defaults laden" @click="loadPreset('light')"><i class="ti ti-sun"></i></button>
          </div>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:20px">

          <div>
            <div class="settings-label">Hintergründe</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div v-for="t in bgTokens" :key="t.key" class="color-field">
                <label>{{ t.label }}</label>
                <div style="display:flex;gap:8px;align-items:center">
                  <input type="color" :value="editorVars.value[t.key]" @input="(e) => setVar(t.key, (e.target as HTMLInputElement).value)"
                    style="width:100%;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;cursor:pointer;padding:2px" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div class="settings-label">Text</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div v-for="t in textTokens" :key="t.key" class="color-field">
                <label>{{ t.label }}</label>
                <input type="color" :value="editorVars.value[t.key]" @input="(e) => setVar(t.key, (e.target as HTMLInputElement).value)"
                  style="width:100%;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;cursor:pointer;padding:2px" />
              </div>
            </div>
          </div>

          <div>
            <div class="settings-label">Akzent</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="color-field">
                <label>Akzentfarbe</label>
                <input type="color" :value="editorVars.value['--accent']"
                  @input="(e) => { const v = (e.target as HTMLInputElement).value; setVar('--accent', v); setVar('--accent-rgb', hexToRgbString(v)) }"
                  style="width:100%;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;cursor:pointer;padding:2px" />
              </div>
              <div class="color-field">
                <label>Akzent (sekundär)</label>
                <input type="color" :value="editorVars.value['--accent-2']" @input="(e) => setVar('--accent-2', (e.target as HTMLInputElement).value)"
                  style="width:100%;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;cursor:pointer;padding:2px" />
              </div>
            </div>
          </div>

          <div>
            <div class="settings-label">Rahmen</div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;align-items:center;gap:10px">
                <input type="color" :value="borderHex"
                  @input="(e) => setBorderHex((e.target as HTMLInputElement).value)"
                  style="width:36px;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;flex-shrink:0;cursor:pointer" />
                <div style="flex:1">
                  <label style="font-size:12px;color:var(--text-muted)">Rahmenfarbe — Deckkraft {{ Math.round(borderAlpha * 100) }}%</label>
                  <input type="range" min="0" max="1" step="0.01" :value="borderAlpha"
                    @input="(e) => setBorderAlpha(parseFloat((e.target as HTMLInputElement).value))"
                    style="width:100%" />
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <input type="color" :value="borderAccentHex"
                  @input="(e) => setBorderAccentHex((e.target as HTMLInputElement).value)"
                  style="width:36px;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;flex-shrink:0;cursor:pointer" />
                <div style="flex:1">
                  <label style="font-size:12px;color:var(--text-muted)">Akzent-Rahmen — Deckkraft {{ Math.round(borderAccentAlpha * 100) }}%</label>
                  <input type="range" min="0" max="1" step="0.01" :value="borderAccentAlpha"
                    @input="(e) => setBorderAccentAlpha(parseFloat((e.target as HTMLInputElement).value))"
                    style="width:100%" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- PREVIEW -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Live-Vorschau</span>
          <span style="font-size:11px;color:var(--text-muted)">Akzent: {{ editorVars.value['--accent'] }}</span>
        </div>
        <div class="card-body">
          <div :style="previewStyle" style="border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)">
            <div :style="`background:${editorVars['--bg-surface']};padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${editorVars.value['--border']}`">
              <strong :style="`color:${editorVars['--text-primary']}`">Meine Firma</strong>
              <div style="display:flex;gap:14px;font-size:13px">
                <span :style="`color:${editorVars['--text-muted']}`">Leistungen</span>
                <span :style="`color:${editorVars.value['--accent']}`">Kontakt</span>
              </div>
            </div>
            <div :style="`background:${editorVars['--bg-base']};padding:40px 20px;text-align:center`">
              <h3 :style="`color:${editorVars['--text-primary']};margin:0 0 8px;font-size:22px`">Willkommen</h3>
              <p :style="`color:${editorVars['--text-secondary']};margin:0 0 20px;font-size:13px`">Das ist eine Live-Vorschau Ihres Themes.</p>
              <button :style="`background:${editorVars.value['--accent']};color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600`">Jetzt starten</button>
              <div :style="`margin-top:14px;display:inline-flex;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, ${editorVars.value['--accent']}, ${editorVars.value['--accent-2']})`"></div>
            </div>
            <div :style="`background:${editorVars['--bg-elevated']};padding:16px 20px;border-top:1px solid ${editorVars.value['--border']};display:flex;gap:8px;flex-wrap:wrap`">
              <span class="badge badge-info">Info</span>
              <span class="badge badge-success">Erfolg</span>
              <span class="badge badge-warning">Hinweis</span>
              <span class="badge badge-danger">Fehler</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- SAVE -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-body" style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
        <div class="auth-field" style="flex:1;min-width:220px;margin:0">
          <label>Theme-Name</label>
          <input v-model="themeName" placeholder="z.B. Kunde Mustermann" />
        </div>
        <button class="accent-btn" :disabled="!themeName || saving" @click="saveAsNew">
          <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-plus"></i> Als neues Theme speichern</span>
        </button>
        <button v-if="editingThemeId" class="accent-btn" :disabled="!themeName || saving"
          style="background:var(--bg-hover);color:var(--text-primary)" @click="updateExisting">
          <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Aktualisieren</span>
        </button>
        <div v-if="saveSuccess" style="color:#5CB85C;font-size:13px;display:flex;align-items:center;gap:4px">
          <i class="ti ti-circle-check"></i> Gespeichert!
        </div>
      </div>
    </div>

    <!-- SAVED THEMES -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Gespeicherte Themes</span>
      </div>
      <table class="data-table">
        <thead>
          <tr><th style="width:120px">Vorschau</th><th>Name</th><th style="width:220px"></th></tr>
        </thead>
        <tbody>
          <tr v-for="preset in builtins" :key="preset.id">
            <td><div style="display:flex;gap:4px">
              <span v-for="c in swatches(preset.vars)" :key="c" :style="{background:c,width:'18px',height:'18px',borderRadius:'4px',border:'0.5px solid rgba(255,255,255,0.1)',display:'inline-block'}"></span>
            </div></td>
            <td class="td-name">{{ preset.name }}
              <span v-if="activeThemeId === preset.id" class="badge badge-success" style="margin-left:6px">Aktiv</span>
            </td>
            <td>
              <div style="display:flex;gap:6px;justify-content:flex-end">
                <button class="icon-btn" title="In Editor laden" @click="loadIntoEditor(preset.vars, '', '')"><i class="ti ti-edit"></i></button>
                <button class="accent-btn" style="height:28px;font-size:12px" :disabled="activeThemeId === preset.id" @click="apply(preset.id)">Anwenden</button>
              </div>
            </td>
          </tr>
          <tr v-for="t in themes" :key="t.themeId">
            <td><div style="display:flex;gap:4px">
              <span v-for="c in swatches(t.vars)" :key="c" :style="{background:c,width:'18px',height:'18px',borderRadius:'4px',border:'0.5px solid rgba(255,255,255,0.1)',display:'inline-block'}"></span>
            </div></td>
            <td class="td-name">{{ t.name }}
              <span v-if="activeThemeId === t.themeId" class="badge badge-success" style="margin-left:6px">Aktiv</span>
            </td>
            <td>
              <div style="display:flex;gap:6px;justify-content:flex-end">
                <button class="icon-btn" title="In Editor laden" @click="loadIntoEditor(t.vars, t.themeId, t.name)"><i class="ti ti-edit"></i></button>
                <button class="accent-btn" style="height:28px;font-size:12px" :disabled="activeThemeId === t.themeId" @click="apply(t.themeId)">Anwenden</button>
                <button class="icon-btn" style="color:var(--danger)" @click="removeTheme(t)"><i class="ti ti-trash"></i></button>
              </div>
            </td>
          </tr>
          <tr v-if="!themes.length">
            <td colspan="3" style="text-align:center;color:var(--text-muted);padding:24px">Noch keine eigenen Themes gespeichert</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { DARK_VARS, LIGHT_VARS, hexToRgbString, rgbaToHexAlpha, hexAlphaToRgba } from '~/modules/themes'
import type { ThemeVars, Theme } from '~/modules/themes'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userId = ref('demo-user')
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userId.value = u.userId
})

const { data: themesData, refresh: refreshThemes } = await useFetch(useApiUrl('/api/themes'), { getCachedData: () => undefined })
const { data: ftData, refresh: refreshFt } = await useFetch(useApiUrl('/api/settings/frontend-theme'), { getCachedData: () => undefined })

const themes = computed(() => (themesData.value as any)?.themes || [])
const activeThemeId = computed(() => (ftData.value as any)?.frontendTheme?.activeThemeId || '')

const builtins = [
  { id: '',          name: 'Dark (Standard)', vars: DARK_VARS },
  { id: '__light__', name: 'Light',           vars: LIGHT_VARS },
]

// Editor-State: Kopie der Vars, wird direkt mutiert
const editorVars = ref<ThemeVars>(JSON.parse(JSON.stringify(DARK_VARS)))

function setVar(key: string, value: string) {
  editorVars.value = { ...editorVars.value, [key]: value }
}

function loadPreset(mode: 'dark' | 'light') {
  editorVars.value = JSON.parse(JSON.stringify(mode === 'dark' ? DARK_VARS : LIGHT_VARS))
}

function loadIntoEditor(vars: ThemeVars, themeId: string, name: string) {
  editorVars.value = JSON.parse(JSON.stringify(vars))
  editingThemeId.value = themeId || null
  themeName.value = name
}

// Token-Gruppen
const bgTokens = [
  { key: '--bg-base',     label: 'Hintergrund' },
  { key: '--bg-surface',  label: 'Flächen' },
  { key: '--bg-elevated', label: 'Erhöhte Flächen' },
  { key: '--bg-hover',    label: 'Hover' },
]
const textTokens = [
  { key: '--text-primary',   label: 'Haupttext' },
  { key: '--text-secondary', label: 'Sekundärtext' },
  { key: '--text-muted',     label: 'Gedämpft' },
]

// Border-Helfer (rgba ↔ hex+alpha)
const borderHex = computed(() => rgbaToHexAlpha(editorVars.value['--border']).hex)
const borderAlpha = computed(() => rgbaToHexAlpha(editorVars.value['--border']).alpha)
const borderAccentHex = computed(() => rgbaToHexAlpha(editorVars.value['--border-accent']).hex)
const borderAccentAlpha = computed(() => rgbaToHexAlpha(editorVars.value['--border-accent']).alpha)

function setBorderHex(hex: string)         { editorVars.value['--border'] = hexAlphaToRgba(hex, borderAlpha.value) }
function setBorderAlpha(a: number)         { editorVars.value['--border'] = hexAlphaToRgba(borderHex.value, a) }
function setBorderAccentHex(hex: string)   { editorVars.value['--border-accent'] = hexAlphaToRgba(hex, borderAccentAlpha.value) }
function setBorderAccentAlpha(a: number)   { editorVars.value['--border-accent'] = hexAlphaToRgba(borderAccentHex.value, a) }

// Preview: kein CSS-Var-Binding, stattdessen direkter inline-Style-String
const previewStyle = computed(() =>
  Object.entries(editorVars.value).map(([k, v]) => `${k}:${v}`).join(';')
)

// Swatch-Farben für die Theme-Liste
function swatches(vars: ThemeVars): string[] {
  return [vars['--bg-base'], vars['--accent'], vars['--bg-elevated'], vars['--accent-2']].filter(Boolean)
}

// Speichern / Laden
const themeName       = ref('')
const editingThemeId  = ref<string | null>(null)
const saving          = ref(false)
const saveSuccess     = ref(false)

async function saveAsNew() {
  saving.value = true
  saveSuccess.value = false
  try {
    const res = await $fetch<{ theme: Theme }>(useApiUrl('/api/themes'), {
      method: 'POST',
      body: { name: themeName.value, vars: { ...editorVars.value }, userId: userId.value }
    })
    await refreshThemes()
    editingThemeId.value = (res as any).theme?.themeId || null
    saveSuccess.value = true
    setTimeout(() => saveSuccess.value = false, 2000)
  } finally {
    saving.value = false
  }
}

async function updateExisting() {
  if (!editingThemeId.value) return
  saving.value = true
  saveSuccess.value = false
  try {
    await $fetch(useApiUrl(`/api/themes/${editingThemeId.value}`), {
      method: 'PATCH',
      body: { name: themeName.value, vars: { ...editorVars.value } }
    })
    await refreshThemes()
    saveSuccess.value = true
    setTimeout(() => saveSuccess.value = false, 2000)
  } finally {
    saving.value = false
  }
}

async function apply(id: string) {
  await $fetch(useApiUrl('/api/settings/frontend-theme'), {
    method: 'POST',
    body: { activeThemeId: id }
  })
  await refreshFt()
}

async function removeTheme(t: Theme) {
  if (!confirm(`Theme "${t.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/themes/${t.themeId}`), { method: 'DELETE' })
  if (activeThemeId.value === t.themeId) await apply('')
  await refreshThemes()
}
</script>
