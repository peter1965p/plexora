<template>
  <div class="page">
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-palette" style="margin-right:8px;color:var(--accent)"></i>Erscheinungsbild</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="saving" @click="save">
          <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:28px">

        <div>
          <div class="settings-label">Farbmodus</div>
          <div class="theme-toggle">
            <button class="theme-opt" :class="{ active: store.theme === 'dark' }" @click="store.setTheme('dark')">
              <i class="ti ti-moon"></i> Dark
            </button>
            <button class="theme-opt" :class="{ active: store.theme === 'light' }" @click="store.setTheme('light')">
              <i class="ti ti-sun"></i> Light
            </button>
          </div>
        </div>

        <div>
          <div class="settings-label">
            Akzentfarbe — {{ store.accentColors.find(c => c.hex === store.accent)?.name || 'Eigene Farbe' }}
          </div>
          <div class="accent-picker">
            <div v-for="c in store.accentColors" :key="c.hex" class="accent-swatch"
              :class="{ active: store.accent === c.hex }" :style="{ background: c.hex }"
              :title="c.name" @click="store.setAccent(c.hex, c.rgb)"></div>
            <label class="accent-swatch" style="display:flex;align-items:center;justify-content:center;border:1px dashed var(--border);cursor:pointer;position:relative" title="Eigene Farbe">
              <i class="ti ti-color-picker" style="color:var(--text-muted)"></i>
              <input type="color" v-model="customColor" @change="applyCustomColor" style="position:absolute;inset:0;opacity:0;cursor:pointer" />
            </label>
          </div>
        </div>

        <div>
          <div class="settings-label">Vorschau</div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:16px;background:var(--bg-elevated);border-radius:12px;border:0.5px solid var(--border)">
            <button class="accent-btn">Primär-Button</button>
            <span class="badge badge-info">Lead</span>
            <span class="badge badge-success">Aktiv</span>
            <a href="#" @click.prevent style="color:var(--accent)">Link-Beispiel</a>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '~/stores/app'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const store = useAppStore()
const saving = ref(false)
const customColor = ref(store.accent)

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

function applyCustomColor() {
  store.setAccent(customColor.value, hexToRgb(customColor.value))
}

async function save() {
  saving.value = true
  try {
    await store.saveTheme()
  } finally {
    saving.value = false
  }
}
</script>
