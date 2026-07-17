<template>
  <div class="page">

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0">Newsletter</h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Abonnenten, Anmeldung und Absender-Einstellungen</p>
      </div>
      <div style="display:flex;gap:10px">
        <button v-if="activeTab === 'campaigns'" class="accent-btn" @click="openNewCampaign">
          <i class="ti ti-plus"></i> Neue Kampagne
        </button>
        <button v-if="activeTab === 'subscribers'" class="accent-btn" @click="showImportModal = true">
          <i class="ti ti-file-import"></i> CSV importieren
        </button>
      </div>
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
      <div v-else-if="!subscribers.length" style="text-align:center;padding:70px 20px;color:var(--text-muted)">
        <i class="ti ti-mail-plus" style="font-size:44px;display:block;margin-bottom:16px;opacity:.35;color:var(--accent)"></i>
        <p style="font-size:15px;font-weight:600;color:var(--text);margin:0 0 8px">Noch keine Abonnenten</p>
        <p style="font-size:13px;max-width:360px;margin:0 auto;line-height:1.6">
          Sobald jemand über das Anmeldeformular auf deiner Website abonniert, taucht er hier auf.
          Du kannst auch direkt <a href="#" @click.prevent="showImportModal = true" style="color:var(--accent)">eine bestehende Liste per CSV importieren</a>.
        </p>
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

    <!-- KAMPAGNEN -->
    <div v-if="activeTab === 'campaigns'" class="card">
      <div v-if="loadingCampaigns" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!campaigns.length" style="text-align:center;padding:70px 20px;color:var(--text-muted)">
        <i class="ti ti-send" style="font-size:44px;display:block;margin-bottom:16px;opacity:.35;color:var(--accent)"></i>
        <p style="font-size:15px;font-weight:600;color:var(--text);margin:0 0 8px">Noch keine Kampagnen</p>
        <p style="font-size:13px;margin:0 0 16px">Erstelle deinen ersten Newsletter-Versand.</p>
        <button class="accent-btn" @click="openNewCampaign"><i class="ti ti-plus" style="margin-right:6px"></i>Neue Kampagne</button>
      </div>
      <table v-else class="data-table">
        <thead>
          <tr><th>Name</th><th>Betreff</th><th>Status</th><th>Empfänger</th><th>Öffnungen</th><th>Klicks</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="c in campaigns" :key="c.campaignId" style="cursor:pointer" @click="openEditCampaign(c)">
            <td class="td-name">{{ c.name }}</td>
            <td style="font-size:12px;color:var(--text-muted)">{{ c.subject }}</td>
            <td><span class="badge" :class="'badge-' + campaignStatusClass(c.status)">{{ campaignStatusLabel(c.status) }}</span></td>
            <td style="font-size:12px">{{ c.status === 'draft' ? '–' : c.stats?.sentCount ?? 0 }}</td>
            <td style="font-size:12px">{{ c.status === 'draft' ? '–' : c.stats?.openCount ?? 0 }}</td>
            <td style="font-size:12px">{{ c.status === 'draft' ? '–' : c.stats?.clickCount ?? 0 }}</td>
            <td>
              <button v-if="c.status !== 'sending'" @click.stop="deleteCampaign(c)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:4px 6px">
                <i class="ti ti-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- VORLAGEN -->
    <div v-if="activeTab === 'templates'" class="card">
      <div v-if="loadingTemplates" style="display:flex;justify-content:center;padding:60px;color:var(--text-muted)">
        <i class="ti ti-loader-2 spin" style="font-size:28px"></i>
      </div>
      <div v-else-if="!templates.length" style="text-align:center;padding:70px 20px;color:var(--text-muted)">
        <i class="ti ti-layout-grid" style="font-size:44px;display:block;margin-bottom:16px;opacity:.35;color:var(--accent)"></i>
        <p style="font-size:15px;font-weight:600;color:var(--text);margin:0 0 8px">Noch keine Vorlagen</p>
        <p style="font-size:13px;margin:0">Speichere eine Kampagne als Vorlage, um sie später wiederzuverwenden.</p>
      </div>
      <table v-else class="data-table">
        <thead><tr><th>Name</th><th>Zuletzt bearbeitet</th><th></th></tr></thead>
        <tbody>
          <tr v-for="t in templates" :key="t.templateId">
            <td class="td-name">{{ t.name }}</td>
            <td style="font-size:12px;color:var(--text-muted)">{{ formatDate(t.updatedAt) }}</td>
            <td style="display:flex;gap:4px;justify-content:flex-end">
              <button class="wide-btn" style="width:auto;padding:0 12px" @click="newCampaignFromTemplate(t)"><i class="ti ti-copy" style="margin-right:6px"></i>Als Kampagne verwenden</button>
              <button @click="deleteTemplate(t)" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:14px;padding:4px 10px"><i class="ti ti-trash"></i></button>
            </td>
          </tr>
        </tbody>
      </table>
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

    <!-- KAMPAGNE ERSTELLEN/BEARBEITEN -->
    <div v-if="showCampaignModal" class="modal-overlay" @click.self="showCampaignModal = false">
      <div style="background:var(--bg-surface);border:0.5px solid var(--border);border-radius:16px;width:100%;max-width:1400px;height:92vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.5)">
        <div class="modal-header">
          <input v-model="campaignForm.name" style="background:transparent;border:none;outline:none;font-size:16px;font-weight:700;color:var(--text);font-family:inherit;flex:1;min-width:0" placeholder="Kampagnenname..." />
          <button @click="showCampaignModal = false" class="icon-btn"><i class="ti ti-x"></i></button>
        </div>

        <div class="campaign-editor-grid">
          <div class="campaign-meta-col">
            <div class="blog-field">
              <label>Betreff</label>
              <input v-model="campaignForm.subject" placeholder="Betreffzeile der E-Mail..." />
            </div>
            <div class="blog-field">
              <label>Zielgruppe</label>
              <input v-model="campaignForm.segmentTag" placeholder="Leer = alle bestätigten Abonnenten" />
            </div>
            <div v-if="campaignStats" style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:12px;display:flex;flex-direction:column;gap:6px">
              <div style="font-weight:700;color:var(--text)">Statistik</div>
              <div>Empfänger: {{ campaignStats.recipientCount ?? campaignStats.sentCount ?? 0 }}</div>
              <div>Versendet: {{ campaignStats.sentCount ?? 0 }}</div>
              <div v-if="campaignStats.openCount !== undefined">Geöffnet: {{ campaignStats.openCount }}</div>
              <div v-if="campaignStats.clickCount !== undefined">Geklickt: {{ campaignStats.clickCount }}</div>
            </div>
            <div style="margin-top:auto;display:flex;flex-direction:column;gap:8px">
              <button class="wide-btn" :disabled="savingTemplate || !campaignForm.bodyHtml" @click="saveAsTemplate">
                <i v-if="savingTemplate" class="ti ti-loader-2 spin"></i>
                <span v-else><i class="ti ti-layout-grid" style="margin-right:6px"></i>Als Vorlage speichern</span>
              </button>
              <button class="wide-btn" :disabled="testSending || !campaignForm.name" @click="testSendCampaign">
                <i v-if="testSending" class="ti ti-loader-2 spin"></i>
                <span v-else><i class="ti ti-send" style="margin-right:6px"></i>Test-Versand an mich</span>
              </button>
              <button class="accent-btn" :disabled="savingCampaign" @click="saveCampaign">
                <i v-if="savingCampaign" class="ti ti-loader-2 spin"></i>
                <span v-else><i class="ti ti-device-floppy" style="margin-right:6px"></i>Entwurf speichern</span>
              </button>
              <button v-if="!campaignIsSent" class="accent-btn" style="background:#22c55e;border-color:#22c55e" :disabled="sendingCampaign || !campaignForm.name" @click="sendCampaign">
                <i v-if="sendingCampaign" class="ti ti-loader-2 spin"></i>
                <span v-else><i class="ti ti-send" style="margin-right:6px"></i>Jetzt an alle senden</span>
              </button>
            </div>
          </div>
          <div class="campaign-editor-col">
            <NewsletterEditor v-model="campaignForm.bodyHtml" />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import NewsletterEditor from '~/components/newsletter/NewsletterEditor.vue'
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
  { key: 'campaigns',   label: 'Kampagnen', icon: 'ti-send' },
  { key: 'templates',   label: 'Vorlagen', icon: 'ti-layout-grid' },
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

interface Campaign {
  campaignId: string
  name: string
  subject: string
  bodyHtml: string
  status: string
  segmentFilter?: { tag: string }
  stats?: { recipientCount: number; sentCount: number; deliveredCount: number; openCount: number; clickCount: number; bounceCount: number; complaintCount: number; unsubscribeCount: number }
  sentAt?: string
  createdAt: string
}

const campaigns        = ref<Campaign[]>([])
const loadingCampaigns  = ref(true)
const showCampaignModal = ref(false)
const editingCampaignId = ref('')
const savingCampaign    = ref(false)
const testSending       = ref(false)
const sendingCampaign   = ref(false)
const campaignStats     = ref<Record<string, number> | null>(null)

const campaignForm = reactive({
  name: '', subject: '',
  bodyHtml: '<h1>Neuigkeiten</h1><p>Hier beginnt dein Text...</p>',
  segmentTag: '',
})

const campaignIsSent = computed(() => {
  const c = campaigns.value.find(c => c.campaignId === editingCampaignId.value)
  return c?.status === 'sent' || c?.status === 'sending'
})

function campaignStatusLabel(s: string) {
  return { draft: 'Entwurf', sending: 'Wird versendet', sent: 'Versendet', failed: 'Fehlgeschlagen' }[s] || s
}
function campaignStatusClass(s: string) {
  return { draft: 'muted', sending: 'warning', sent: 'success', failed: 'danger' }[s] || 'muted'
}

async function loadCampaigns() {
  loadingCampaigns.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ campaigns: Campaign[] }>(useApiUrl('/api/newsletter/campaigns'), { headers: await useAuthHeader() })
    campaigns.value = res.campaigns || []
  } catch {}
  loadingCampaigns.value = false
}

function openNewCampaign() {
  editingCampaignId.value = ''
  campaignForm.name = ''
  campaignForm.subject = ''
  campaignForm.bodyHtml = '<h1>Neuigkeiten</h1><p>Hier beginnt dein Text...</p>'
  campaignForm.segmentTag = ''
  campaignStats.value = null
  showCampaignModal.value = true
}

function openEditCampaign(c: Campaign) {
  editingCampaignId.value = c.campaignId
  campaignForm.name = c.name
  campaignForm.subject = c.subject
  campaignForm.bodyHtml = c.bodyHtml
  campaignForm.segmentTag = c.segmentFilter?.tag || ''
  campaignStats.value = c.status !== 'draft' ? (c.stats as any) : null
  showCampaignModal.value = true
}

async function saveCampaign() {
  savingCampaign.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const headers = await useAuthHeader()
    const body = {
      name: campaignForm.name || 'Neue Kampagne',
      subject: campaignForm.subject,
      bodyHtml: campaignForm.bodyHtml,
      segmentFilter: { tag: campaignForm.segmentTag },
    }
    if (editingCampaignId.value) {
      await $fetch(useApiUrl(`/api/newsletter/campaigns/${editingCampaignId.value}`), { method: 'PATCH', headers, body })
    } else {
      const res = await $fetch<{ campaign: Campaign }>(useApiUrl('/api/newsletter/campaigns'), { method: 'POST', headers, body })
      editingCampaignId.value = res.campaign.campaignId
    }
    await loadCampaigns()
  } finally {
    savingCampaign.value = false
  }
}

async function testSendCampaign() {
  if (!editingCampaignId.value) await saveCampaign()
  if (!editingCampaignId.value) return
  testSending.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    await $fetch(useApiUrl(`/api/newsletter/campaigns/${editingCampaignId.value}/test-send`), { method: 'POST', headers: await useAuthHeader() })
    alert('Test-Mail wurde an deine eigene Adresse verschickt.')
  } finally {
    testSending.value = false
  }
}

async function sendCampaign() {
  if (!confirm('Kampagne jetzt an alle passenden Abonnenten senden? Das kann nicht rückgängig gemacht werden.')) return
  if (!editingCampaignId.value) await saveCampaign()
  if (!editingCampaignId.value) return
  sendingCampaign.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ sentCount: number; recipientCount: number }>(
      useApiUrl(`/api/newsletter/campaigns/${editingCampaignId.value}/send`),
      { method: 'POST', headers: await useAuthHeader() },
    )
    campaignStats.value = { recipientCount: res.recipientCount, sentCount: res.sentCount, openCount: 0, clickCount: 0 } as any
    await loadCampaigns()
  } finally {
    sendingCampaign.value = false
  }
}

async function deleteCampaign(c: Campaign) {
  if (!confirm(`"${c.name}" wirklich löschen?`)) return
  const { useAuthHeader } = await import('~/composables/useAuth')
  await $fetch(useApiUrl(`/api/newsletter/campaigns/${c.campaignId}`), { method: 'DELETE', headers: await useAuthHeader() })
  await loadCampaigns()
}

interface Template {
  templateId: string
  name: string
  bodyHtml: string
  updatedAt: string
}

const templates       = ref<Template[]>([])
const loadingTemplates = ref(true)
const savingTemplate   = ref(false)

async function loadTemplates() {
  loadingTemplates.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    const res = await $fetch<{ templates: Template[] }>(useApiUrl('/api/newsletter/templates'), { headers: await useAuthHeader() })
    templates.value = res.templates || []
  } catch {}
  loadingTemplates.value = false
}

async function saveAsTemplate() {
  const name = window.prompt('Name der Vorlage:', campaignForm.name || 'Neue Vorlage')
  if (!name) return
  savingTemplate.value = true
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    await $fetch(useApiUrl('/api/newsletter/templates'), {
      method: 'POST',
      headers: await useAuthHeader(),
      body: { name, bodyHtml: campaignForm.bodyHtml },
    })
    await loadTemplates()
    alert('Als Vorlage gespeichert.')
  } finally {
    savingTemplate.value = false
  }
}

function newCampaignFromTemplate(t: Template) {
  editingCampaignId.value = ''
  campaignForm.name = t.name
  campaignForm.subject = ''
  campaignForm.bodyHtml = t.bodyHtml
  campaignForm.segmentTag = ''
  campaignStats.value = null
  activeTab.value = 'campaigns'
  showCampaignModal.value = true
}

async function deleteTemplate(t: Template) {
  if (!confirm(`Vorlage "${t.name}" wirklich löschen?`)) return
  const { useAuthHeader } = await import('~/composables/useAuth')
  await $fetch(useApiUrl(`/api/newsletter/templates/${t.templateId}`), { method: 'DELETE', headers: await useAuthHeader() })
  await loadTemplates()
}

onMounted(async () => {
  await Promise.all([loadSubscribers(), loadSettings(), loadCampaigns(), loadTemplates()])
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

.campaign-editor-grid {
  display: grid;
  grid-template-columns: 300px 1fr;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.campaign-meta-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 20px;
  border-right: 0.5px solid var(--border);
  background: var(--bg-elevated);
  overflow-y: auto;
}
.campaign-editor-col {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.wide-btn {
  width: 100%; height: 34px; border-radius: 8px; background: transparent;
  border: 0.5px solid var(--border); color: var(--text-secondary); font-family: inherit;
  font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center;
  white-space: nowrap; transition: background .15s, color .15s;
}
.wide-btn:hover { background: var(--bg-hover, var(--bg-elevated)); color: var(--text); }
.wide-btn:disabled { opacity: .5; cursor: default; }
@media (max-width: 900px) {
  .campaign-editor-grid { grid-template-columns: 1fr; overflow-y: auto; }
  .campaign-meta-col { border-right: none; border-bottom: 0.5px solid var(--border); overflow-y: visible; }
  .campaign-editor-col { min-height: 400px; }
}
</style>
