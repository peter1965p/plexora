<template>
  <div class="page">

    <!-- TAB NAV -->
    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button v-for="t in tabs" :key="t.key" class="theme-opt" :class="{ active: tab === t.key }" @click="tab=t.key">
        <i class="ti" :class="t.icon"></i> {{ t.label }}
      </button>
    </div>

    <!-- BRANDING -->
    <div v-if="tab === 'branding'" class="card">
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
            <input v-model="brand.brandName" placeholder="Plexora" />
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
        <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:12px;padding:20px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em">Vorschau</div>
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em">
            {{ brandFirst }}<span style="color:var(--accent)">{{ brandLast }}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:8px">
            <span style="font-size:22px;font-weight:800;letter-spacing:-0.02em">
              {{ brandFirst }}<span style="color:var(--accent)">{{ brandLast }}</span>
            </span>
            <span style="font-size:10px;color:var(--accent);font-weight:600;text-transform:uppercase;letter-spacing:.05em">{{ brand.portalTitle }}</span>
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px">{{ brand.brandTagline }}</div>
        </div>
      </div>
    </div>

    <!-- DARSTELLUNG -->
    <div v-if="tab === 'appearance'" class="card">
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
            <div v-for="c in store.accentColors" :key="c.hex" class="accent-swatch"
              :class="{ active: store.accent === c.hex }" :style="{ background: c.hex }"
              :title="c.name" @click="store.setAccent(c.hex, c.rgb)"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- RECHNUNGEN -->
    <div v-if="tab === 'invoices'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-receipt" style="margin-right:8px;color:var(--accent)"></i>Rechnungseinstellungen</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="invoiceSaving" @click="saveInvoiceSettings">
          <span v-if="invoiceSaving"><i class="ti ti-loader-2 spin"></i></span>
          <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
        </button>
      </div>
      <div class="card-body" style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div class="auth-field">
          <label>Standard-Fälligkeit (Tage nach Rechnungsdatum)</label>
          <input v-model.number="invoiceSettings.dueDays" type="number" min="1" max="90" placeholder="7" />
        </div>
        <div class="auth-field">
          <label>Zahlungsziel-Text auf Rechnung</label>
          <input v-model="invoiceSettings.dueText" placeholder="Zahlbar innerhalb von 7 Tagen netto" />
        </div>
      </div>
    </div>

    <!-- MAHNWESEN -->
    <div v-if="tab === 'dunning'">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title"><i class="ti ti-alert-triangle" style="margin-right:8px;color:#E05C5C"></i>Mahnwesen</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" :disabled="dunningSaving" @click="saveDunningSettings">
            <span v-if="dunningSaving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-device-floppy"></i> Speichern</span>
          </button>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:20px">

          <!-- Stufe 1 -->
          <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <span class="badge badge-info">Stufe 1</span>
              <span style="font-size:13px;font-weight:600">Freundliche Erinnerung</span>
              <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
                <span style="font-size:12px;color:var(--text-muted)">Aktiv</span>
                <div class="pill-toggle" :class="{ on: dunning.level1.active }" @click="dunning.level1.active=!dunning.level1.active" style="cursor:pointer"><div class="pill-thumb"></div></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="auth-field"><label>Tage nach Fälligkeit</label><input v-model.number="dunning.level1.days" type="number" min="1" placeholder="5" /></div>
              <div class="auth-field"><label>Mahngebühr (€)</label><input v-model.number="dunning.level1.fee" type="number" min="0" placeholder="0" /></div>
            </div>
            <div class="auth-field">
              <label>Mahntext</label>
              <textarea v-model="dunning.level1.text" rows="3" style="background:var(--bg-base);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
            </div>
          </div>

          <!-- Stufe 2 -->
          <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <span class="badge badge-warning">Stufe 2</span>
              <span style="font-size:13px;font-weight:600">Zweite Mahnung</span>
              <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
                <span style="font-size:12px;color:var(--text-muted)">Aktiv</span>
                <div class="pill-toggle" :class="{ on: dunning.level2.active }" @click="dunning.level2.active=!dunning.level2.active" style="cursor:pointer"><div class="pill-thumb"></div></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="auth-field"><label>Tage nach Fälligkeit</label><input v-model.number="dunning.level2.days" type="number" min="1" placeholder="14" /></div>
              <div class="auth-field"><label>Mahngebühr (€)</label><input v-model.number="dunning.level2.fee" type="number" min="0" placeholder="15" /></div>
            </div>
            <div class="auth-field">
              <label>Mahntext</label>
              <textarea v-model="dunning.level2.text" rows="3" style="background:var(--bg-base);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
            </div>
          </div>

          <!-- Stufe 3 -->
          <div style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:10px;padding:16px">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              <span class="badge badge-danger">Stufe 3</span>
              <span style="font-size:13px;font-weight:600">Letzte Mahnung</span>
              <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
                <span style="font-size:12px;color:var(--text-muted)">Aktiv</span>
                <div class="pill-toggle" :class="{ on: dunning.level3.active }" @click="dunning.level3.active=!dunning.level3.active" style="cursor:pointer"><div class="pill-thumb"></div></div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="auth-field"><label>Tage nach Fälligkeit</label><input v-model.number="dunning.level3.days" type="number" min="1" placeholder="30" /></div>
              <div class="auth-field"><label>Mahngebühr (€)</label><input v-model.number="dunning.level3.fee" type="number" min="0" placeholder="40" /></div>
              <div class="auth-field">
                <label>Inkasso-Androhung</label>
                <div style="display:flex;align-items:center;gap:8px;margin-top:10px">
                  <div class="pill-toggle" :class="{ on: dunning.level3.inkasso }" @click="dunning.level3.inkasso=!dunning.level3.inkasso" style="cursor:pointer"><div class="pill-thumb"></div></div>
                  <span style="font-size:12px;color:var(--text-muted)">{{ dunning.level3.inkasso ? 'Aktiv' : 'Inaktiv' }}</span>
                </div>
              </div>
            </div>
            <div class="auth-field">
              <label>Mahntext</label>
              <textarea v-model="dunning.level3.text" rows="3" style="background:var(--bg-base);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODULE -->
    <div v-if="tab === 'modules'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-puzzle" style="margin-right:8px;color:var(--accent)"></i>Module</span>
        <span style="font-size:11px;color:var(--text-muted)">{{ store.modules.filter(m => m.on).length }} / {{ store.modules.length }} aktiv</span>
      </div>
      <div class="card-body">
        <div class="module-grid">
          <div v-for="m in store.modules" :key="m.key" class="module-pill" :class="{ on: m.on }" @click="store.toggleModule(m.key)">
            <i class="ti pill-icon" :class="m.icon"></i>
            <span class="pill-name">{{ m.name }}</span>
            <div class="pill-toggle" :class="{ on: m.on }"><div class="pill-thumb"></div></div>
          </div>
        </div>
      </div>
    </div>

    <!-- KONTO -->
    <div v-if="tab === 'account'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-user-circle" style="margin-right:8px;color:var(--accent)"></i>Konto</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div><div class="settings-label">Name</div><div style="font-size:13px;color:var(--text-primary);font-weight:500">{{ userName }}</div></div>
          <div><div class="settings-label">E-Mail</div><div style="font-size:13px;color:var(--text-primary)">{{ userEmail }}</div></div>
          <div><div class="settings-label">Rolle</div><span class="badge badge-info">Administrator</span></div>
          <div><div class="settings-label">Plan</div><span class="badge badge-success">Plexora Pro</span></div>
        </div>
      </div>
    </div>

    <!-- INFRASTRUKTUR -->
    <div v-if="tab === 'infra'" class="card">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-cloud" style="margin-right:8px;color:var(--accent)"></i>Infrastruktur</span>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
          <div class="infra-pill"><i class="ti ti-shield-check" style="color:#00D4B4"></i><div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">AWS Cognito</div><div style="font-size:11px;color:var(--text-muted)">Auth — Frankfurt</div></div></div>
          <div class="infra-pill"><i class="ti ti-database" style="color:var(--accent)"></i><div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">DynamoDB</div><div style="font-size:11px;color:var(--text-muted)">10 Tabellen aktiv</div></div></div>
          <div class="infra-pill"><i class="ti ti-world" style="color:#F0B428"></i><div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">Cloudflare</div><div style="font-size:11px;color:var(--text-muted)">plexora.paeffgen-it.de</div></div></div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { getCurrentUser } from 'aws-amplify/auth'
import { useAppStore } from '~/stores/app'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const store = useAppStore()
const tab   = ref('branding')

const tabs = [
  { key: 'branding',    label: 'Branding',        icon: 'ti-building'        },
  { key: 'appearance',  label: 'Darstellung',      icon: 'ti-palette'         },
  { key: 'invoices',    label: 'Rechnungen',       icon: 'ti-receipt'         },
  { key: 'dunning',     label: 'Mahnwesen',        icon: 'ti-alert-triangle'  },
  { key: 'modules',     label: 'Module',           icon: 'ti-puzzle'          },
  { key: 'account',     label: 'Konto',            icon: 'ti-user-circle'     },
  { key: 'infra',       label: 'Infrastruktur',    icon: 'ti-cloud'           },
]

// ── Auth ──────────────────────────────────────────────
const userName  = ref('–')
const userEmail = ref('–')

// ── Branding ──────────────────────────────────────────
const brandSaving = ref(false)
const brand = reactive({ brandName: 'Plexora', brandTagline: 'Business Platform', portalTitle: 'Kundenportal' })
const brandFirst = computed(() => brand.brandName.slice(0, -1))
const brandLast  = computed(() => brand.brandName.slice(-1))

// ── Rechnungen ────────────────────────────────────────
const invoiceSaving = ref(false)
const invoiceSettings = reactive({ dueDays: 7, dueText: 'Zahlbar innerhalb von 7 Tagen netto' })

// ── Mahnwesen ─────────────────────────────────────────
const dunningSaving = ref(false)
const dunning = reactive({
  level1: { active: true, days: 5,  fee: 0,  text: 'Wir möchten Sie freundlich daran erinnern, dass die folgende Rechnung noch offen ist. Bitte begleichen Sie den ausstehenden Betrag umgehend.' },
  level2: { active: true, days: 14, fee: 15, text: 'Trotz unserer ersten Mahnung haben wir noch keinen Zahlungseingang verbuchen können. Wir bitten Sie dringend, den ausstehenden Betrag inklusive Mahngebühr zu begleichen.' },
  level3: { active: true, days: 30, fee: 40, inkasso: true, text: 'Dies ist unsere letzte Mahnung. Sollte der ausstehende Betrag nicht innerhalb von 7 Tagen beglichen werden, sehen wir uns gezwungen, die Forderung an ein Inkassounternehmen zu übergeben.' }
})

onMounted(async () => {
  try {
    const user = await getCurrentUser()
    userEmail.value = user.signInDetails?.loginId || '–'
    userName.value  = user.username || '–'
  } catch {}

  try {
    const d = await $fetch(useApiUrl('/api/settings/branding') as any)
    if (d?.branding) Object.assign(brand, d.branding)
  } catch {}

  try {
    const d = await $fetch(useApiUrl('/api/settings/invoice') as any)
    if (d?.settings) Object.assign(invoiceSettings, d.settings)
  } catch {}

  try {
    const d = await $fetch(useApiUrl('/api/settings/dunning') as any)
    if (d?.settings) Object.assign(dunning, d.settings)
  } catch {}
})

async function saveBranding() {
  brandSaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/branding'), { method: 'POST', body: { ...brand } })
    const { useBranding } = await import('~/composables/useBranding')
    const { branding } = useBranding()
    Object.assign(branding.value, brand)
  } finally {
    brandSaving.value = false
  }
}

async function saveInvoiceSettings() {
  invoiceSaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/invoice'), { method: 'POST', body: { ...invoiceSettings } })
  } finally {
    invoiceSaving.value = false
  }
}

async function saveDunningSettings() {
  dunningSaving.value = true
  try {
    await $fetch(useApiUrl('/api/settings/dunning'), { method: 'POST', body: { ...dunning } })
  } finally {
    dunningSaving.value = false
  }
}
</script>
