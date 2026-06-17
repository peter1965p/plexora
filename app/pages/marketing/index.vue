<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-speakerphone stat-icon"></i>
        <div class="stat-label">Kampagnen</div>
        <div class="stat-value">{{ campaigns.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ campaigns.filter((c:any) => c.active).length }} aktiv</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-users stat-icon"></i>
        <div class="stat-label">Leads gesamt</div>
        <div class="stat-value">{{ totalLeads }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> via Landingpages</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-chart-bar stat-icon"></i>
        <div class="stat-label">Beste Kampagne</div>
        <div class="stat-value" style="font-size:16px">{{ bestCampaign }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> meiste Leads</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-link stat-icon"></i>
        <div class="stat-label">Basis-URL</div>
        <div class="stat-value" style="font-size:13px">plexora.paeffgen-it.de</div>
        <div class="stat-delta up">/lead/[formId]</div>
      </div>
    </div>

    <!-- KAMPAGNEN-LISTE -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title">Kampagnen</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openAdd">
          <i class="ti ti-plus"></i> Neue Kampagne
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Name</th><th>Formular</th><th>Slug</th><th>Leads</th><th>UTM</th><th style="width:120px"></th></tr>
        </thead>
        <tbody>
          <tr v-if="!campaigns.length">
            <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Keine Kampagnen — erste anlegen!</td>
          </tr>
          <tr v-for="c in campaigns" :key="c.campaignId">
            <td class="td-name">
              {{ c.name }}
              <span v-if="!c.active" class="badge badge-warning" style="margin-left:6px">Inaktiv</span>
            </td>
            <td style="font-size:12px">{{ formTitle(c.formId) }}</td>
            <td style="font-size:12px">
              <span v-if="c.slug" style="color:var(--accent)">/{{ c.slug }}</span>
              <span v-else style="color:var(--text-muted)">/lead/{{ c.formId?.slice(0,8) }}...</span>
            </td>
            <td>
              <span class="badge badge-info">{{ leadStats[c.utmCampaign || c.name] || 0 }}</span>
            </td>
            <td style="font-size:11px;color:var(--text-muted)">{{ c.utmSource || '—' }} / {{ c.utmCampaign || '—' }}</td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="icon-btn" title="Link kopieren" @click="copyLink(c)"><i class="ti ti-copy"></i></button>
                <button class="icon-btn" title="QR-Code" @click="showQr(c)"><i class="ti ti-qrcode"></i></button>
                <button class="icon-btn" @click="openEdit(c)"><i class="ti ti-pencil"></i></button>
                <button class="icon-btn" style="color:var(--danger)" @click="deleteCampaign(c)"><i class="ti ti-trash"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- KAMPAGNEN MODAL (Erstellen/Bearbeiten) -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-card" style="max-width:720px;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <span class="card-title">{{ editing ? 'Kampagne bearbeiten' : 'Neue Kampagne' }}</span>
          <button class="icon-btn" @click="showModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

          <!-- LINKE SPALTE: Einstellungen -->
          <div style="display:flex;flex-direction:column;gap:14px">
            <div class="auth-field"><label>Kampagnen-Name</label><input v-model="form.name" placeholder="Kostenlose Beratung" /></div>
            <div class="auth-field">
              <label>Formular</label>
              <select v-model="form.formId" class="form-select">
                <option value="">— Formular wählen —</option>
                <option v-for="f in forms" :key="f.formId" :value="f.formId">{{ f.title }}</option>
              </select>
            </div>
            <div class="auth-field">
              <label>Vanity-Slug (optional)</label>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:13px;color:var(--text-muted)">/</span>
                <input v-model="form.slug" placeholder="beratung" style="flex:1" />
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
                Link: plexora.paeffgen-it.de/{{ form.slug || 'lead/' + (form.formId?.slice(0,8) || '...') }}
              </div>
            </div>

            <div style="border-top:0.5px solid var(--border);padding-top:14px">
              <div class="settings-label" style="margin-bottom:10px">🎨 Design</div>
              <div class="auth-field"><label>Headline</label><input v-model="form.headline" placeholder="Kostenlose IT-Beratung" /></div>
              <div class="auth-field"><label>Subtext</label><input v-model="form.subtext" placeholder="Jetzt unverbindlich anfragen" /></div>
              <div class="auth-field">
                <label>Header-Bild</label>
                <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                  <img v-if="form.headerImageUrl" :src="form.headerImageUrl"
                    style="height:48px;max-width:120px;object-fit:cover;border-radius:6px;border:0.5px solid var(--border)" />
                  <label style="cursor:pointer">
                    <input type="file" accept="image/*" style="display:none" @change="uploadHeaderImage" :disabled="headerUploading" />
                    <span class="accent-btn" style="height:28px;font-size:12px;padding:0 12px;display:inline-flex;align-items:center;gap:6px;pointer-events:none">
                      <i class="ti" :class="headerUploading ? 'ti-loader-2 spin' : 'ti-upload'"></i>
                      {{ headerUploading ? 'Lädt...' : form.headerImageUrl ? 'Ändern' : 'Bild hochladen' }}
                    </span>
                  </label>
                  <button v-if="form.headerImageUrl" class="icon-btn" style="color:var(--danger)" @click="form.headerImageUrl=''" title="Entfernen">
                    <i class="ti ti-trash"></i>
                  </button>
                </div>
              </div>
              <div class="auth-field">
                <label>Akzentfarbe</label>
                <div style="display:flex;gap:8px;align-items:center">
                  <input type="color" v-model="form.accentColor" style="width:48px;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;cursor:pointer" />
                  <span style="font-size:12px;color:var(--text-muted)">{{ form.accentColor }}</span>
                </div>
              </div>
            </div>

            <div style="border-top:0.5px solid var(--border);padding-top:14px">
              <div class="settings-label" style="margin-bottom:10px">📊 UTM-Tracking</div>
              <div class="auth-row">
                <div class="auth-field"><label>utm_source</label><input v-model="form.utmSource" placeholder="linkedin" /></div>
                <div class="auth-field"><label>utm_medium</label><input v-model="form.utmMedium" placeholder="social" /></div>
              </div>
              <div class="auth-field"><label>utm_campaign</label><input v-model="form.utmCampaign" placeholder="beratung-2026" /></div>
            </div>
          </div>

          <!-- RECHTE SPALTE: Live-Vorschau -->
          <div>
            <div class="settings-label" style="margin-bottom:10px">👁 Live-Vorschau</div>
            <div :style="`background:#0a0e1a;border-radius:12px;overflow:hidden;border:0.5px solid var(--border);min-height:300px`">
              <div v-if="form.headerImageUrl" style="height:120px;overflow:hidden">
                <img :src="form.headerImageUrl" style="width:100%;height:100%;object-fit:cover" />
              </div>
              <div style="padding:20px;text-align:center">
                <div style="font-size:18px;font-weight:800;color:#f0eef9;margin-bottom:6px">
                  {{ form.headline || 'Deine Headline hier' }}
                </div>
                <div style="font-size:13px;color:#8b8fa8;margin-bottom:16px">
                  {{ form.subtext || 'Dein Subtext hier' }}
                </div>
                <button :style="`background:${form.accentColor};color:#fff;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600`">
                  {{ selectedForm?.submitLabel || 'Jetzt anfragen' }}
                </button>
              </div>
              <div style="padding:0 20px 16px;display:flex;flex-direction:column;gap:6px">
                <div v-for="field in (selectedForm?.fields || []).slice(0,3)" :key="field.id"
                  style="background:#13182a;border:0.5px solid rgba(255,255,255,0.07);border-radius:6px;padding:8px 12px;font-size:12px;color:#545870">
                  {{ field.label }}{{ field.required ? ' *' : '' }}
                </div>
                <div v-if="(selectedForm?.fields || []).length > 3" style="font-size:11px;color:#545870;text-align:center">
                  + {{ (selectedForm?.fields || []).length - 3 }} weitere Felder...
                </div>
              </div>
            </div>

            <!-- Kampagnen-Link -->
            <div v-if="form.formId" style="margin-top:12px;background:var(--bg-elevated);border-radius:8px;padding:12px;font-size:12px">
              <div style="color:var(--text-muted);margin-bottom:4px">Kampagnen-Link:</div>
              <div style="color:var(--accent);word-break:break-all">{{ campaignUrl }}</div>
            </div>
          </div>

        </div>
        <div style="padding:0 24px 24px">
          <button class="auth-btn" :disabled="!form.name || !form.formId || saving" @click="save">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editing ? 'Speichern' : 'Kampagne erstellen' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- QR-CODE MODAL -->
    <div v-if="qrCampaign" class="modal-overlay" @click.self="qrCampaign=null">
      <div class="modal-card" style="max-width:360px;text-align:center">
        <div class="modal-header">
          <span class="card-title">QR-Code — {{ qrCampaign.name }}</span>
          <button class="icon-btn" @click="qrCampaign=null"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body" style="align-items:center">
          <div id="qr-container" style="background:#fff;padding:16px;border-radius:8px;display:inline-block"></div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:8px;word-break:break-all">{{ qrUrl }}</div>
          <button class="auth-btn" @click="copyQrUrl">
            <i class="ti ti-copy"></i> Link kopieren
          </button>
        </div>
      </div>
    </div>

    <!-- TOAST -->
    <div v-if="toast" class="toast-success"><i class="ti ti-circle-check"></i> {{ toast }}</div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userId = ref('demo-user')
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userId.value = u.userId
})

const { data: campaignsData, refresh } = await useFetch(useApiUrl('/api/marketing'), { getCachedData: () => undefined })
const { data: formsData }               = await useFetch(useApiUrl('/api/forms'),     { getCachedData: () => undefined })
const { data: statsData }               = await useFetch(useApiUrl('/api/marketing/stats'), { getCachedData: () => undefined })

const campaigns = computed(() => (campaignsData.value as any)?.campaigns || [])
const forms     = computed(() => (formsData.value as any)?.forms || [])
const leadStats = computed(() => (statsData.value as any)?.stats || {})

const totalLeads  = computed(() => Object.values(leadStats.value).reduce((s: any, v: any) => s + v, 0) as number)
const bestCampaign = computed(() => {
  const entries = Object.entries(leadStats.value) as [string, number][]
  if (!entries.length) return '—'
  return entries.sort((a, b) => b[1] - a[1])[0][0]
})

const BASE_URL = 'https://plexora.paeffgen-it.de'

function formTitle(formId: string): string {
  return forms.value.find((f: any) => f.formId === formId)?.title || '—'
}

function getCampaignUrl(c: any): string {
  const base = c.slug ? `${BASE_URL}/${c.slug}` : `${BASE_URL}/lead/${c.formId}`
  const params = new URLSearchParams()
  if (c.utmSource)   params.set('utm_source', c.utmSource)
  if (c.utmMedium)   params.set('utm_medium', c.utmMedium)
  if (c.utmCampaign) params.set('utm_campaign', c.utmCampaign)
  const q = params.toString()
  return q ? `${base}?${q}` : base
}

async function copyLink(c: any) {
  await navigator.clipboard.writeText(getCampaignUrl(c))
  showToast('Link kopiert!')
}

// ── QR-Code ─────────────────────────────────────────
const qrCampaign = ref<any>(null)
const qrUrl = computed(() => qrCampaign.value ? getCampaignUrl(qrCampaign.value) : '')

async function showQr(c: any) {
  qrCampaign.value = c
  await nextTick()
  const container = document.getElementById('qr-container')
  if (!container) return
  container.innerHTML = ''
  const QRCode = (await import('qrcode')).default
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, qrUrl.value, { width: 200, margin: 1 })
  container.appendChild(canvas)
}

function copyQrUrl() {
  navigator.clipboard.writeText(qrUrl.value)
  showToast('Link kopiert!')
}

// ── Modal ────────────────────────────────────────────
const showModal = ref(false)
const editing   = ref<any>(null)
const saving    = ref(false)
const form = reactive({
  name: '', slug: '', formId: '', headline: '', subtext: '',
  headerImageUrl: '', accentColor: '#6C3FE8',
  utmSource: '', utmMedium: 'social', utmCampaign: '',
})

const selectedForm = computed(() => forms.value.find((f: any) => f.formId === form.formId) || null)

const campaignUrl = computed(() => {
  if (!form.formId) return ''
  const base = form.slug ? `${BASE_URL}/${form.slug}` : `${BASE_URL}/lead/${form.formId}`
  const params = new URLSearchParams()
  if (form.utmSource)   params.set('utm_source', form.utmSource)
  if (form.utmMedium)   params.set('utm_medium', form.utmMedium)
  if (form.utmCampaign) params.set('utm_campaign', form.utmCampaign)
  const q = params.toString()
  return q ? `${base}?${q}` : base
})

function resetForm() {
  Object.assign(form, {
    name: '', slug: '', formId: '', headline: '', subtext: '',
    headerImageUrl: '', accentColor: '#6C3FE8',
    utmSource: '', utmMedium: 'social', utmCampaign: '',
  })
}

function openAdd() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function openEdit(c: any) {
  editing.value = c
  Object.assign(form, {
    name: c.name, slug: c.slug || '', formId: c.formId || '',
    headline: c.headline || '', subtext: c.subtext || '',
    headerImageUrl: c.headerImageUrl || '', accentColor: c.accentColor || '#6C3FE8',
    utmSource: c.utmSource || '', utmMedium: c.utmMedium || 'social', utmCampaign: c.utmCampaign || '',
  })
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(useApiUrl(`/api/marketing/${editing.value.campaignId}`), {
        method: 'PATCH', body: { ...form, userId: userId.value }
      })
    } else {
      await $fetch(useApiUrl('/api/marketing'), {
        method: 'POST', body: { ...form, userId: userId.value }
      })
    }
    await refresh()

    // Vanity-Slug in _redirects eintragen wenn slug angegeben
    showModal.value = false
    showToast(editing.value ? 'Kampagne aktualisiert!' : 'Kampagne erstellt!')
  } finally {
    saving.value = false
  }
}

async function deleteCampaign(c: any) {
  if (!confirm(`Kampagne "${c.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/marketing/${c.campaignId}`), { method: 'DELETE' })
  await refresh()
}

// ── Header-Upload
const headerUploading = ref(false)
async function uploadHeaderImage(e) {
  const file = e.target.files?.[0]
  if (!file) return
  headerUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('prefix', 'marketing/')
    const res = await $fetch(useApiUrl('/api/aws/s3-upload'), { method: 'POST', body: fd })
    if (res?.url) form.headerImageUrl = res.url
    else if (res?.key) form.headerImageUrl = 'https://plexora-files.s3.eu-central-1.amazonaws.com/' + res.key
  } catch (err) { console.error('Upload fehlgeschlagen:', err) }
  finally { headerUploading.value = false }
}

// ── Header-Upload
  finally { headerUploading.value = false }
}

// ── Toast ────────────────────────────────────────────
const toast = ref('')
function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => toast.value = '', 2500)
}
</script>
