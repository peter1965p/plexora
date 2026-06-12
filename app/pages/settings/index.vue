<template>
  <div class="page">

    <!-- BRANDING -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-building" style="margin-right:8px;color:var(--accent)"></i>Branding</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="brandSaving" @click="saveBranding">
          <span v-if="brandSaving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="auth-field">
            <label>Produktname</label>
            <input v-model="brand.brandName" placeholder="Plexora" @input="updatePreview" />
          </div>
          <div class="auth-field">
            <label>Tagline (Landing Page)</label>
            <input v-model="brand.brandTagline" placeholder="Business Platform" />
          </div>
          <div class="auth-field">
            <label>Kundenportal Titel</label>
            <input v-model="brand.portalTitle" placeholder="Kundenportal" />
          </div>
        </div>
        <!-- LIVE PREVIEW -->
        <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:20px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em">Vorschau</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em">
              {{ brandFirst }}<span style="color:var(--accent)">{{ brandLast }}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:22px;font-weight:800;letter-spacing:-0.02em">
                {{ brandFirst }}<span style="color:var(--accent)">{{ brandLast }}</span>
              </span>
              <span style="font-size:10px;color:var(--accent);font-weight:600;text-transform:uppercase;letter-spacing:.05em">{{ brand.portalTitle }}</span>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">{{ brand.brandTagline }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- APPEARANCE -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-palette" style="margin-right:8px;color:var(--accent)"></i>Darstellung</span>
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
          <div class="settings-label">Akzentfarbe — {{ store.accentColors.find(c => c.hex === store.accent)?.name }}</div>
          <div class="accent-picker">
            <div
              v-for="c in store.accentColors"
              :key="c.hex"
              class="accent-swatch"
              :class="{ active: store.accent === c.hex }"
              :style="{ background: c.hex }"
              :title="c.name"
              @click="store.setAccent(c.hex, c.rgb)"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODULES -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-puzzle" style="margin-right:8px;color:var(--accent)"></i>Module</span>
        <span style="font-size:11px;color:var(--text-muted)">{{ store.modules.filter(m => m.on).length }} / {{ store.modules.length }} aktiv</span>
      </div>
      <div class="card-body">
        <div class="module-grid">
          <div
            v-for="m in store.modules"
            :key="m.key"
            class="module-pill"
            :class="{ on: m.on }"
            @click="store.toggleModule(m.key)"
          >
            <i class="ti pill-icon" :class="m.icon"></i>
            <span class="pill-name">{{ m.name }}</span>
            <div class="pill-toggle" :class="{ on: m.on }">
              <div class="pill-thumb"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ACCOUNT -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-user-circle" style="margin-right:8px;color:var(--accent)"></i>Konto</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div>
            <div class="settings-label">Name</div>
            <div style="font-size:13px;color:var(--text-primary);font-weight:500">{{ userName }}</div>
          </div>
          <div>
            <div class="settings-label">E-Mail</div>
            <div style="font-size:13px;color:var(--text-primary)">{{ userEmail }}</div>
          </div>
          <div>
            <div class="settings-label">Rolle</div>
            <span class="badge badge-info">Administrator</span>
          </div>
          <div>
            <div class="settings-label">Plan</div>
            <span class="badge badge-success">Plexora Pro</span>
          </div>
        </div>
      </div>
    </div>

    <!-- INFRASTRUKTUR -->
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-cloud" style="margin-right:8px;color:var(--accent)"></i>Infrastruktur</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          <div class="infra-pill">
            <i class="ti ti-shield-check" style="color:#00D4B4"></i>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-primary)">AWS Cognito</div>
              <div style="font-size:11px;color:var(--text-muted)">Auth — Frankfurt</div>
            </div>
          </div>
          <div class="infra-pill">
            <i class="ti ti-database" style="color:var(--accent)"></i>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-primary)">DynamoDB</div>
              <div style="font-size:11px;color:var(--text-muted)">7 Tabellen aktiv</div>
            </div>
          </div>
          <div class="infra-pill">
            <i class="ti ti-world" style="color:#F0B428"></i>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-primary)">Cloudflare</div>
              <div style="font-size:11px;color:var(--text-muted)">plexora.paeffgen-it.de</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { getCurrentUser } from 'aws-amplify/auth'
import { useAppStore } from '~/stores/app'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const store       = useAppStore()
const userName    = ref('–')
const userEmail   = ref('–')
const brandSaving = ref(false)

const brand = reactive({
  brandName:    'Plexora',
  brandTagline: 'Business Platform',
  portalTitle:  'Kundenportal',
})

const brandFirst = computed(() => brand.brandName.slice(0, -1))
const brandLast  = computed(() => brand.brandName.slice(-1))

function updatePreview() {
  // Live-Preview reagiert automatisch durch computed
}

onMounted(async () => {
  try {
    const user = await getCurrentUser()
    userEmail.value = user.signInDetails?.loginId || '–'
    userName.value  = user.username || '–'
  } catch {}

  // Branding laden
  try {
    const data = await $fetch('/api/settings/branding') as any
    if (data?.branding) {
      Object.assign(brand, data.branding)
    }
  } catch {}
})

async function saveBranding() {
  brandSaving.value = true
  try {
    await $fetch('/api/settings/branding', {
      method: 'POST',
      body: { ...brand }
    })
    // Global State aktualisieren
    const { useBranding } = await import('~/composables/useBranding')
    const { branding } = useBranding()
    Object.assign(branding.value, brand)
  } finally {
    brandSaving.value = false
  }
}
</script>
