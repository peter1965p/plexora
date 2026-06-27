<template>
  <div class="page">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px">
      <div style="width:36px;height:36px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center">
        <i class="ti ti-world" style="font-size:18px;color:#fff"></i>
      </div>
      <div>
        <div style="font-size:18px;font-weight:700">Unternehmens-Webseite</div>
        <div style="font-size:12px;color:var(--text-muted)">Nexora · powered by Plexora</div>
      </div>
      <div style="margin-left:auto;display:flex;gap:8px">
        <a v-if="nexora?.subdomain" :href="`https://${nexora.subdomain}.nexora.de`" target="_blank" class="btn-secondary" style="font-size:12px;display:flex;align-items:center;gap:6px">
          <i class="ti ti-external-link"></i> Vorschau
        </a>
        <button class="accent-btn" style="height:32px;font-size:12px;padding:0 14px" @click="save" :disabled="saving">
          <i class="ti" :class="saving ? 'ti-loader-2 spin' : 'ti-device-floppy'" style="margin-right:4px"></i>
          {{ saving ? 'Speichern...' : 'Speichern' }}
        </button>
      </div>
    </div>

    <!-- Not provisioned yet -->
    <div v-if="!nexora && !loading" style="text-align:center;padding:60px 20px">
      <div style="width:64px;height:64px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
        <i class="ti ti-world-off" style="font-size:28px;color:var(--text-muted)"></i>
      </div>
      <div style="font-size:16px;font-weight:600;margin-bottom:8px">Nexora noch nicht aktiviert</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:24px">Kaufe das Modul "Unternehmens-Webseite" im Modul-Store, um deine Firmenwebseite einzurichten.</div>
      <NuxtLink to="/store" class="accent-btn" style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;font-size:13px">
        <i class="ti ti-building-store"></i> Zum Modul-Store
      </NuxtLink>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" style="padding:60px;text-align:center;color:var(--text-muted)">
      <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
    </div>

    <!-- Main content -->
    <template v-else-if="nexora">

      <!-- Status Banner -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;padding:14px 18px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px">
        <div style="width:8px;height:8px;background:#22c55e;border-radius:50%;box-shadow:0 0 6px #22c55e88;flex-shrink:0"></div>
        <div style="font-size:13px;font-weight:600">Nexora ist aktiv</div>
        <div style="font-size:12px;color:var(--text-muted)">Tenant-ID: {{ nexora.tenantId }}</div>
        <div style="margin-left:auto;font-size:11px;color:var(--text-muted)">
          Aktiviert: {{ nexora.createdAt ? new Date(nexora.createdAt).toLocaleDateString('de-DE') : '–' }}
        </div>
      </div>

      <div class="ws-grid">

        <!-- LEFT: Config -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- API Key Card -->
          <div class="card">
            <div class="card-header">
              <span class="card-title"><i class="ti ti-key" style="margin-right:8px;color:var(--accent)"></i>API-Key</span>
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px">
              Trage diesen Key in dein Nexora-Frontend als <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:11px">VITE_PLEXORA_TENANT_ID</code> und <code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-size:11px">VITE_PLEXORA_API_KEY</code> ein.
            </div>
            <div style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div style="flex:1;font-family:monospace;font-size:12px;color:var(--accent);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                {{ showKey ? nexora.apiKey : nexora.apiKey.slice(0,12) + '••••••••••••••••••••' }}
              </div>
              <button class="icon-btn" @click="showKey = !showKey" :title="showKey ? 'Verbergen' : 'Anzeigen'">
                <i class="ti" :class="showKey ? 'ti-eye-off' : 'ti-eye'"></i>
              </button>
              <button class="icon-btn" @click="copyKey" :title="copied ? 'Kopiert!' : 'Kopieren'">
                <i class="ti" :class="copied ? 'ti-check' : 'ti-copy'" :style="copied ? 'color:#22c55e' : ''"></i>
              </button>
            </div>
            <div style="font-size:11px;color:var(--text-muted)">Tenant-ID: <code style="font-size:11px">{{ nexora.tenantId }}</code></div>
          </div>

          <!-- Company Settings -->
          <div class="card">
            <div class="card-header">
              <span class="card-title"><i class="ti ti-building" style="margin-right:8px;color:var(--accent)"></i>Unternehmen</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div>
                <label class="field-label">Unternehmensname</label>
                <input v-model="form.companyName" class="field-input" placeholder="Muster GmbH" />
              </div>
              <div>
                <label class="field-label">Subdomain</label>
                <div style="display:flex;align-items:center;gap:0">
                  <input v-model="form.subdomain" class="field-input" placeholder="meinefirma" style="border-radius:8px 0 0 8px;flex:1" />
                  <div style="padding:0 12px;height:36px;background:var(--bg-elevated);border:1px solid var(--border);border-left:none;border-radius:0 8px 8px 0;display:flex;align-items:center;font-size:12px;color:var(--text-muted);white-space:nowrap">.nexora.de</div>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Nur Kleinbuchstaben, Zahlen und Bindestriche</div>
              </div>
            </div>
          </div>

          <!-- Design Settings -->
          <div class="card">
            <div class="card-header">
              <span class="card-title"><i class="ti ti-palette" style="margin-right:8px;color:var(--accent)"></i>Design</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:14px">
              <div>
                <label class="field-label">Primärfarbe</label>
                <div style="display:flex;align-items:center;gap:10px">
                  <input type="color" v-model="form.primaryColor" style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--bg);cursor:pointer" />
                  <input v-model="form.primaryColor" class="field-input" style="flex:1;font-family:monospace" placeholder="#6C3FE8" />
                </div>
              </div>
              <div>
                <label class="field-label">Hintergrundfarbe</label>
                <div style="display:flex;align-items:center;gap:10px">
                  <input type="color" v-model="form.secondaryColor" style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;padding:2px;background:var(--bg);cursor:pointer" />
                  <input v-model="form.secondaryColor" class="field-input" style="flex:1;font-family:monospace" placeholder="#0a0e1a" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Setup Guide + Preview -->
        <div style="display:flex;flex-direction:column;gap:16px">

          <!-- Quick Start -->
          <div class="card">
            <div class="card-header">
              <span class="card-title"><i class="ti ti-rocket" style="margin-right:8px;color:var(--accent)"></i>Quick Start</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:12px">
              <div v-for="(step, i) in steps" :key="i" style="display:flex;gap:12px;align-items:flex-start">
                <div style="width:22px;height:22px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;margin-top:1px">{{ i + 1 }}</div>
                <div>
                  <div style="font-size:13px;font-weight:600;margin-bottom:2px">{{ step.title }}</div>
                  <div style="font-size:12px;color:var(--text-muted)">{{ step.desc }}</div>
                  <code v-if="step.code" style="display:block;margin-top:6px;padding:6px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--accent);word-break:break-all">{{ step.code }}</code>
                </div>
              </div>
            </div>
          </div>

          <!-- Public API Docs -->
          <div class="card">
            <div class="card-header">
              <span class="card-title"><i class="ti ti-api" style="margin-right:8px;color:var(--accent)"></i>Public API Endpoints</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <div v-for="ep in apiEndpoints" :key="ep.path" style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg);border:1px solid var(--border);border-radius:6px">
                <span style="font-size:10px;font-weight:700;color:#22c55e;background:#22c55e18;border-radius:4px;padding:2px 6px">GET</span>
                <code style="font-size:11px;color:var(--text);flex:1">{{ ep.path }}</code>
                <span style="font-size:11px;color:var(--text-muted)">{{ ep.desc }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { useAuthUser } = await import('~/composables/useAuth')
const u = await useAuthUser()

const loading = ref(true)
const saving  = ref(false)
const nexora  = ref<any>(null)
const showKey = ref(false)
const copied  = ref(false)

const form = reactive({
  companyName:    '',
  subdomain:      '',
  primaryColor:   '#6C3FE8',
  secondaryColor: '#0a0e1a',
})

onMounted(async () => {
  try {
    const res = await $fetch<any>(useApiUrl('/api/nexora/my'), {
      headers: { 'x-user-email': u.email || '' },
    })
    if (res?.nexora) {
      nexora.value = res.nexora
      form.companyName    = res.nexora.companyName || ''
      form.subdomain      = res.nexora.subdomain   || ''
      form.primaryColor   = res.nexora.config?.primaryColor   || '#6C3FE8'
      form.secondaryColor = res.nexora.config?.secondaryColor || '#0a0e1a'
    }
  } catch {}
  loading.value = false
})

async function save() {
  saving.value = true
  try {
    await $fetch(useApiUrl('/api/nexora/my'), {
      method: 'PUT',
      headers: { 'x-user-email': u.email || '' },
      body: {
        companyName: form.companyName,
        subdomain:   form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        config: {
          primaryColor:   form.primaryColor,
          secondaryColor: form.secondaryColor,
        },
      },
    })
    if (nexora.value) {
      nexora.value.companyName = form.companyName
      nexora.value.subdomain   = form.subdomain
    }
  } catch (e: any) {
    alert('Fehler beim Speichern: ' + (e?.message || ''))
  }
  saving.value = false
}

function copyKey() {
  if (!nexora.value?.apiKey) return
  navigator.clipboard.writeText(nexora.value.apiKey)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const steps = computed(() => [
  {
    title: 'Tenant-ID & API-Key kopieren',
    desc:  'Kopiere deine Tenant-ID und den API-Key aus der Karte links.',
    code:  null,
  },
  {
    title: 'Nexora-Frontend einrichten',
    desc:  'Trage folgende Werte in die .env deines Nexora-Projekts ein:',
    code:  `VITE_PLEXORA_TENANT_ID=${nexora.value?.tenantId || '<deine-tenant-id>'}\nVITE_PLEXORA_API_KEY=${nexora.value ? nexora.value.apiKey.slice(0,12) + '...' : '<dein-api-key>'}`,
  },
  {
    title: 'Subdomain & Design konfigurieren',
    desc:  'Lege hier deinen Unternehmensnamen, die Subdomain und dein Design fest.',
    code:  null,
  },
  {
    title: 'Nexora deployen',
    desc:  'Deploye das Nexora-Frontend auf Cloudflare Pages oder Vercel — fertig!',
    code:  null,
  },
])

const apiEndpoints = computed(() => [
  { path: `/api/public/${nexora.value?.tenantId || '<tenantId>'}/branding`, desc: 'Design & Config' },
  { path: `/api/public/${nexora.value?.tenantId || '<tenantId>'}/pages`,    desc: 'Seiten-Inhalte' },
])
</script>

<style scoped>
.ws-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 900px) {
  .ws-grid { grid-template-columns: 1fr; }
}
.field-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  font-family: inherit;
  transition: border-color .15s;
}
.field-input:focus {
  outline: none;
  border-color: var(--accent);
}
.spin {
  animation: spin .8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
