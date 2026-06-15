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
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:20px">

          <div>
            <div class="settings-label">Hintergründe</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
              <div v-for="t in bgTokens" :key="t.key" class="color-field">
                <label>{{ t.label }}</label>
                <input type="color" v-model="editorVars[t.key]" />
              </div>
            </div>
          </div>

          <div>
            <div class="settings-label">Text</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
              <div v-for="t in textTokens" :key="t.key" class="color-field">
                <label>{{ t.label }}</label>
                <input type="color" v-model="editorVars[t.key]" />
              </div>
            </div>
          </div>

          <div>
            <div class="settings-label">Akzent</div>
            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
              <div class="color-field">
                <label>Akzentfarbe</label>
                <input type="color" v-model="accentHex" />
              </div>
              <div class="color-field">
                <label>Akzent (sekundär)</label>
                <input type="color" v-model="editorVars['--accent-2']" />
              </div>
            </div>
          </div>

          <div>
            <div class="settings-label">Rahmen</div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div style="display:flex;align-items:center;gap:10px">
                <input type="color" v-model="borderHex" style="width:36px;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;flex-shrink:0" />
                <div style="flex:1">
                  <label style="font-size:12px;color:var(--text-muted)">Rahmenfarbe — Deckkraft {{ Math.round(borderAlpha * 100) }}%</label>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="borderAlpha" style="width:100%" />
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <input type="color" v-model="borderAccentHex" style="width:36px;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;flex-shrink:0" />
                <div style="flex:1">
                  <label style="font-size:12px;color:var(--text-muted)">Akzent-Rahmen — Deckkraft {{ Math.round(borderAccentAlpha * 100) }}%</label>
                  <input type="range" min="0" max="1" step="0.01" v-model.number="borderAccentAlpha" style="width:100%" />
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
        </div>
        <div class="card-body">
          <div :style="editorVars" style="border-radius:12px;overflow:hidden;border:1px solid var(--border)">
            <div style="background:var(--bg-surface);padding:14px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)">
              <strong style="color:var(--text-primary)">Meine Firma</strong>
              <div style="display:flex;gap:14px;font-size:13px">
                <span style="color:var(--text-muted)">Leistungen</span>
                <span style="color:var(--accent)">Kontakt</span>
              </div>
            </div>
            <div style="background:var(--bg-base);padding:40px 20px;text-align:center">
              <h3 style="color:var(--text-primary);margin:0 0 8px;font-size:22px">Willkommen</h3>
              <p style="color:var(--text-secondary);margin:0 0 20px;font-size:13px">Das ist eine Live-Vorschau Ihres Themes.</p>
              <button style="background:var(--accent);color:#fff;border:none;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600">Jetzt starten</button>
              <div style="margin-top:14px;display:inline-flex;width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, var(--accent), var(--accent-2))"></div>
            </div>
            <div style="background:var(--bg-elevated);padding:16px 20px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap">
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
          <i class="ti ti-plus"></i> Als neues Theme speichern
        </button>
        <button v-if="editingThemeId" class="accent-btn" :disabled="!themeName || saving" style="background:var(--bg-hover);color:var(--text-primary)" @click="updateExisting">
          <i class="ti ti-device-floppy"></i> Aktualisieren
        </button>
      </div>
    </div>

    <!-- SAVED THEMES -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Themes</span>
      </div>
      <table class="data-table">
        <thead>
          <tr><th style="width:90px"></th><th>Name</th><th style="width:240px"></th></tr>
        </thead>
        <tbody>
          <tr v-for="preset in builtins" :key="preset.id">
            <td><div style="display:flex;gap:4px"><span v-for="c in swatches(preset.vars)" :key="c" :style="{background:c}" style="width:18px;height:18px;border-radius:4px;border:0.5px solid var(--border)"></span></div></td>
            <td class="td-name">
              {{ preset.name }}
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
            <td><div style="display:flex;gap:4px"><span v-for="c in swatches(t.vars)" :key="c" :style="{background:c}" style="width:18px;height:18px;border-radius:4px;border:0.5px solid var(--border)"></span></div></td>
            <td class="td-name">
              {{ t.name }}
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
import {
  DARK_VARS, LIGHT_VARS, hexToRgbString, rgbaToHexAlpha, hexAlphaToRgba,
} from '~/modules/themes'
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
  { id: '',         name: 'Dark (Standard)', vars: DARK_VARS },
  { id: '__light__', name: 'Light',          vars: LIGHT_VARS },
]

const editorVars = reactive<ThemeVars>({ ...DARK_VARS })
const themeName = ref('')
const editingThemeId = ref<string | null>(null)
const saving = ref(false)

const bgTokens = [
  { key: '--bg-base',    label: 'Hintergrund' },
  { key: '--bg-surface', label: 'Flächen' },
  { key: '--bg-elevated', label: 'Erhöhte Flächen' },
  { key: '--bg-hover',   label: 'Hover' },
]
const textTokens = [
  { key: '--text-primary',   label: 'Haupttext' },
  { key: '--text-secondary', label: 'Sekundärtext' },
  { key: '--text-muted',     label: 'Gedämpft' },
]

const accentHex = computed({
  get: () => editorVars['--accent'],
  set: (v: string) => { editorVars['--accent'] = v; editorVars['--accent-rgb'] = hexToRgbString(v) }
})

const borderHex = computed({
  get: () => rgbaToHexAlpha(editorVars['--border']).hex,
  set: (v: string) => { editorVars['--border'] = hexAlphaToRgba(v, borderAlpha.value) }
})
const borderAlpha = computed({
  get: () => rgbaToHexAlpha(editorVars['--border']).alpha,
  set: (v: number) => { editorVars['--border'] = hexAlphaToRgba(borderHex.value, v) }
})
const borderAccentHex = computed({
  get: () => rgbaToHexAlpha(editorVars['--border-accent']).hex,
  set: (v: string) => { editorVars['--border-accent'] = hexAlphaToRgba(v, borderAccentAlpha.value) }
})
const borderAccentAlpha = computed({
  get: () => rgbaToHexAlpha(editorVars['--border-accent']).alpha,
  set: (v: number) => { editorVars['--border-accent'] = hexAlphaToRgba(borderAccentHex.value, v) }
})

function swatches(vars: ThemeVars): string[] {
  return [vars['--bg-base'], vars['--accent'], vars['--bg-elevated'], vars['--accent-2']]
}

function loadIntoEditor(vars: ThemeVars, themeId: string, name: string) {
  Object.assign(editorVars, JSON.parse(JSON.stringify(vars)))
  editingThemeId.value = themeId || null
  themeName.value = name
}

async function apply(id: string) {
  await $fetch(useApiUrl('/api/settings/frontend-theme'), {
    method: 'POST',
    body: { activeThemeId: id }
  })
  await refreshFt()
}

async function saveAsNew() {
  saving.value = true
  try {
    const res = await $fetch<{ theme: Theme }>(useApiUrl('/api/themes'), {
      method: 'POST',
      body: { name: themeName.value, vars: { ...editorVars }, userId: userId.value }
    })
    await refreshThemes()
    editingThemeId.value = res.theme.themeId
  } finally {
    saving.value = false
  }
}

async function updateExisting() {
  if (!editingThemeId.value) return
  saving.value = true
  try {
    await $fetch(useApiUrl(`/api/themes/${editingThemeId.value}`), {
      method: 'PATCH',
      body: { name: themeName.value, vars: { ...editorVars } }
    })
    await refreshThemes()
  } finally {
    saving.value = false
  }
}

async function removeTheme(t: Theme) {
  if (!confirm(`Theme "${t.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/themes/${t.themeId}`), { method: 'DELETE' })
  if (activeThemeId.value === t.themeId) await apply('')
  await refreshThemes()
}
</script>

<style scoped>
.color-field { display:flex; flex-direction:column; gap:6px; }
.color-field label { font-size:12px; color:var(--text-muted); }
.color-field input[type="color"] { width:100%; height:36px; border-radius:6px; border:0.5px solid var(--border); background:none; cursor:pointer; padding:2px; }
</style>
