<template>
  <div class="page">

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Newsletter</h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Abonnenten, Anmeldung und Absender-Einstellungen</p>
      </div>
      <button class="accent-btn" @click="showImportModal = true">
        <i class="ti ti-file-import"></i> CSV importieren
      </button>
    </div>

    <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
      <button v-for="tab in tabs" :key="tab.key" class="theme-opt" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <i class="ti" :class="tab.icon"></i> {{ tab.label }}
      </button>
    </div>

    <!-- ABONNENTEN -->
    <div v-if="activeTab === 'subscribers'" class="card">
      <div v-if="loading" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!subscribers.length" style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <i class="ti ti-mail-off" style="font-size:40px;display:block;margin-bottom:12px;opacity:.3"></i>
        <p style="font-size:14px">Noch keine Abonnenten.</p>
      </div>
      <table v-else class="data-table">
        <thead>
          <tr><th>E-Mail</th><th>Status</th><th>Tags</th><th>Angemeldet</th><th>Bestätigt</th></tr>
        </thead>
        <tbody>
          <tr v-for="s in subscribers" :key="s.subscriberId">
            <td class="td-name">{{ s.email }}</td>
            <td><span class="badge" :class="'badge-' + statusClass(s.status)">{{ statusLabel(s.status) }}</span></td>
            <td style="font-size:12px;color:var(--text-muted)">{{ (s.tags || []).join(', ') }}</td>
            <td style="font-size:12px">{{ formatDate(s.createdAt) }}</td>
            <td style="font-size:12px">{{ formatDate(s.confirmedAt) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="nextCursor" style="padding:14px;text-align:center">
        <button class="icon-btn" :disabled="loadingMore" @click="loadSubscribers(true)">
          <i v-if="loadingMore" class="ti ti-loader-2 spin"></i>
          <span v-else>Mehr laden</span>
        </button>
      </div>
    </div>

    <!-- EINSTELLUNGEN -->
    <div v-if="activeTab === 'settings'" class="card" style="max-width:560px">
      <div class="card-header">
        <span class="card-title"><i class="ti ti-settings" style="margin-right:8px;color:var(--accent)"></i>Absender-Einstellungen</span>
      </div>
      <div class="card-body" style="display:flex;flex-direction:column;gap:14px">
        <div class="blog-field">
          <label>Absendername</label>
          <input v-model="settings.senderName" placeholder="z.B. Dein Firmenname" />
        </div>
        <div class="blog-field">
          <label>Reply-To (Antworten landen hier)</label>
          <input v-model="settings.replyTo" placeholder="kontakt@deine-firma.de" />
        </div>
        <div class="blog-field">
          <label>Impressum (Pflichtangabe, erscheint im Footer jeder Mail)</label>
          <textarea v-model="settings.impressum" rows="5" placeholder="Firma GmbH, Musterstraße 1, 12345 Musterstadt..."
            style="width:100%;font-family:inherit;font-size:12px;color:var(--text);background:var(--bg-surface);border:1px solid var(--border);border-radius:6px;padding:10px;resize:vertical"></textarea>
        </div>
        <div>
          <button class="accent-btn" :disabled="savingSettings" @click="saveSettings">
            <i v-if="savingSettings" class="ti ti-loader-2 spin"></i>
            <span v-else><i class="ti ti-device-floppy" style="margin-right:4px"></i>Speichern</span>
          </button>
        </div>
      </div>
    </div>

    <!-- CSV IMPORT MODAL -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="closeImportModal">
      <div class="modal-card" style="max-width:520px">
        <div class="modal-header">
          <span style="font-weight:700">CSV-Import</span>
          <button @click="closeImportModal" class="icon-btn"><i class="ti ti-x"></i></button>
        </div>
        <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
          <p style="font-size:12px;color:var(--text-muted);margin:0">
            CSV mit einer Spalte <code>email</code> (Pflicht) und optional <code>tags</code> (mit <code>;</code> getrennt).
            Importierte Adressen erhalten eine Bestätigungs-Mail — kein Blind-Import ohne Einwilligung.
          </p>
          <input type="file" accept=".csv,text/csv" @change="onCsvSelected" />
          <p v-if="csvRows.length" style="font-size:12px;color:var(--text)">{{ csvRows.length }} Adresse(n) erkannt.</p>
          <button class="accent-btn" :disabled="!csvRows.length || importing" @click="submitImport">
            <i v-if="importing" class="ti ti-loader-2 spin"></i>
            <span v-else>{{ csvRows.length }} Adresse(n) importieren</span>
          </button>
          <p v-if="importResult" style="font-size:12px;color:var(--text)">
            {{ importResult.imported }} importiert, {{ importResult.skipped }} übersprungen (ungültig/doppelt).
          </p>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface Subscriber {
  subscriberId: string
  email: string
  status: string
  tags: string[]
  createdAt: string
  confirmedAt?: string
}

const tabs = [
  { key: 'subscribers', label: 'Abonnenten', icon: 'ti-users' },
  { key: 'settings',    label: 'Einstellungen', icon: 'ti-settings' },
]
const activeTab = ref('subscribers')

const subscribers  = ref<Subscriber[]>([])
const nextCursor    = ref<string | null>(null)
const loading        = ref(true)
const loadingMore    = ref(false)

function statusLabel(s: string) {
  return { pending: 'Ausstehend', confirmed: 'Bestätigt', unsubscribed: 'Abgemeldet', bounced: 'Unzustellbar' }[s] || s
}
function statusClass(s: string) {
  return { pending: 'warning', confirmed: 'success', unsubscribed: 'muted', bounced: 'danger' }[s] || 'muted'
}
function formatDate(d?: string) {
  if (!d) return '–'
  return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadSubscribers(more = false) {
  if (more) loadingMore.value = true; else loading.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const params = new URLSearchParams({ limit: '100' })
    if (more && nextCursor.value) params.set('cursor', nextCursor.value)
    const res = await $fetch<{ subscribers: Subscriber[]; nextCursor: string | null }>(
      useApiUrl(`/api/newsletter/subscribers?${params.toString()}`),
      { headers: await useAuthHeader() },
    )
    subscribers.value = more ? [...subscribers.value, ...(res.subscribers || [])] : (res.subscribers || [])
    nextCursor.value = res.nextCursor
  } catch {}
  loading.value = false
  loadingMore.value = false
}

const settings = reactive({ senderName: '', replyTo: '', impressum: '' })
const savingSettings = ref(false)

async function loadSettings() {
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ newsletter: typeof settings }>(useApiUrl('/api/settings/newsletter'), { headers: await useAuthHeader() })
    if (res?.newsletter) Object.assign(settings, res.newsletter)
  } catch {}
}
async function saveSettings() {
  savingSettings.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    await $fetch(useApiUrl('/api/settings/newsletter'), { method: 'POST', headers: await useAuthHeader(), body: { ...settings } })
  } finally {
    savingSettings.value = false
  }
}

const showImportModal = ref(false)
const csvRows = ref<{ email: string; tags?: string[] }[]>([])
const importing = ref(false)
const importResult = ref<{ imported: number; skipped: number } | null>(null)

function closeImportModal() {
  showImportModal.value = false
  csvRows.value = []
  importResult.value = null
}

function parseCsv(text: string): { email: string; tags?: string[] }[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (!lines.length) return []
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const emailIdx = header.indexOf('email')
  const tagsIdx = header.indexOf('tags')
  if (emailIdx === -1) return []
  return lines.slice(1).map(line => {
    const cols = line.split(',')
    const email = (cols[emailIdx] || '').trim()
    const tags = tagsIdx !== -1 ? (cols[tagsIdx] || '').split(';').map(t => t.trim()).filter(Boolean) : []
    return { email, tags }
  }).filter(r => r.email)
}

function onCsvSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { csvRows.value = parseCsv(String(reader.result || '')) }
  reader.readAsText(file)
}

async function submitImport() {
  importing.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ imported: number; skipped: number }>(useApiUrl('/api/newsletter/subscribers/import'), {
      method: 'POST',
      headers: await useAuthHeader(),
      body: { subscribers: csvRows.value },
    })
    importResult.value = res
    csvRows.value = []
    await loadSubscribers()
  } catch {
    importResult.value = { imported: 0, skipped: 0 }
  } finally {
    importing.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSubscribers(), loadSettings()])
})
</script>

<style scoped>
.blog-field label { display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 5px; }
.blog-field input {
  width: 100%; height: 32px; font-size: 12px; font-family: inherit; color: var(--text);
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; padding: 0 10px;
}
.badge-warning { background: #f59e0b22; color: #f59e0b; border: 1px solid #f59e0b44; }
.badge-success { background: #22c55e22; color: #22c55e; border: 1px solid #22c55e44; }
.badge-danger  { background: #ef444422; color: #ef4444; border: 1px solid #ef444444; }
.badge-muted   { background: var(--bg-elevated); color: var(--text-muted); border: 1px solid var(--border); }
</style>
