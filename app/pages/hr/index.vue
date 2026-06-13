<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-users stat-icon"></i>
        <div class="stat-label">Mitarbeiter gesamt</div>
        <div class="stat-value">{{ employees.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ activeCount }} aktiv</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-beach stat-icon"></i>
        <div class="stat-label">Im Urlaub</div>
        <div class="stat-value">{{ vacationCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> aktuell</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-speakerphone stat-icon"></i>
        <div class="stat-label">Kampagnen aktiv</div>
        <div class="stat-value">{{ activeCampaigns }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ totalApplications }} Bewerbungen</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-user-minus stat-icon"></i>
        <div class="stat-label">Offboarding</div>
        <div class="stat-value">{{ offboardingCount }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> in Bearbeitung</div>
      </div>
    </div>

    <!-- TABS -->
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="theme-opt" :class="{ active: tab === 'employees' }" @click="tab='employees'">
        <i class="ti ti-users"></i> Mitarbeiter
      </button>
      <button class="theme-opt" :class="{ active: tab === 'recruiting' }" @click="tab='recruiting'">
        <i class="ti ti-speakerphone"></i> Recruiting
      </button>
    </div>

    <!-- MITARBEITER TAB -->
    <div v-if="tab === 'employees'" class="card">
      <div class="card-header">
        <span class="card-title">Mitarbeiter</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
          <i class="ti ti-plus"></i> Neu
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Name</th><th>Abteilung</th><th>Rolle</th><th>Start</th><th>Status</th></tr>
        </thead>
        <tbody>
          <tr v-if="!employees.length">
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Keine Mitarbeiter</td>
          </tr>
          <tr v-for="e in employees" :key="e.employeeId">
            <td class="td-name">{{ e.firstName }} {{ e.lastName }}</td>
            <td>{{ e.department }}</td>
            <td style="font-size:12px">{{ e.role }}</td>
            <td style="font-size:12px">{{ e.startDate }}</td>
            <td><span class="badge" :class="statusBadge(e.status)">{{ statusLabel(e.status) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- RECRUITING TAB -->
    <div v-if="tab === 'recruiting'">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">Stellenkampagnen</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showCampaign=true">
            <i class="ti ti-plus"></i> Neue Kampagne
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>Stelle</th><th>Abteilung</th><th>Ort</th><th>Typ</th><th>Link</th><th style="width:60px">Bewerb.</th></tr>
          </thead>
          <tbody>
            <tr v-if="!campaigns.length">
              <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">Keine Kampagnen</td>
            </tr>
            <tr v-for="c in campaigns" :key="c.campaignId">
              <td class="td-name">{{ c.title }}</td>
              <td>{{ c.department }}</td>
              <td style="font-size:12px">{{ c.location }}</td>
              <td><span class="badge badge-info">{{ typeLabel[c.type] || c.type }}</span></td>
              <td>
                <button class="icon-btn" title="Link kopieren" @click="copyLink(c.campaignId)">
                  <i class="ti ti-link"></i>
                </button>
              </td>
              <td style="text-align:center">
                <button class="accent-btn" style="height:24px;font-size:11px;padding:0 8px" @click="viewApplications(c)">
                  {{ applicationCount(c.campaignId) }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- BEWERBUNGEN -->
      <div v-if="selectedCampaign" class="card">
        <div class="card-header">
          <span class="card-title">Bewerbungen — {{ selectedCampaign.title }}</span>
          <button class="icon-btn" @click="selectedCampaign=null"><i class="ti ti-x"></i></button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>Name</th><th>E-Mail</th><th>Telefon</th><th>Datum</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr v-if="!selectedApplications.length">
              <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Keine Bewerbungen</td>
            </tr>
            <tr v-for="a in selectedApplications" :key="a.applicationId">
              <td class="td-name">{{ a.firstName }} {{ a.lastName }}</td>
              <td style="font-size:12px">{{ a.email }}</td>
              <td style="font-size:12px">{{ a.phone }}</td>
              <td style="font-size:12px">{{ a.created?.slice(0,10) }}</td>
              <td><span class="badge badge-info">{{ a.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MITARBEITER MODAL -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Neuer Mitarbeiter</span>
          <button class="icon-btn" @click="showAdd=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-row">
            <div class="auth-field"><label>Vorname</label><input v-model="newEmp.firstName" placeholder="Max" /></div>
            <div class="auth-field"><label>Nachname</label><input v-model="newEmp.lastName" placeholder="Mustermann" /></div>
          </div>
          <div class="auth-field"><label>E-Mail</label><input v-model="newEmp.email" placeholder="max@firma.de" /></div>
          <div class="auth-field"><label>Abteilung</label><input v-model="newEmp.department" placeholder="Engineering" /></div>
          <div class="auth-field"><label>Rolle</label><input v-model="newEmp.role" placeholder="Developer" /></div>
          <div class="auth-field"><label>Startdatum</label><input v-model="newEmp.startDate" type="date" /></div>
          <button class="auth-btn" :disabled="saving" @click="addEmployee">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>Mitarbeiter speichern</span>
          </button>
        </div>
      </div>
    </div>

    <!-- KAMPAGNE MODAL -->
    <div v-if="showCampaign" class="modal-overlay" @click.self="showCampaign=false">
      <div class="modal-card" style="max-width:600px">
        <div class="modal-header">
          <span class="card-title">Neue Stellenkampagne</span>
          <button class="icon-btn" @click="showCampaign=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Stellenbezeichnung</label><input v-model="newCamp.title" placeholder="Senior Developer" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>Abteilung</label><input v-model="newCamp.department" placeholder="Engineering" /></div>
            <div class="auth-field"><label>Standort</label><input v-model="newCamp.location" placeholder="Remote / Berlin" /></div>
          </div>
          <div class="auth-field">
            <label>Beschäftigungsart</label>
            <select v-model="newCamp.type" class="form-select">
              <option value="fulltime">Vollzeit</option>
              <option value="parttime">Teilzeit</option>
              <option value="internship">Praktikum</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>
          <div class="auth-field">
            <label>Stellenbeschreibung</label>
            <textarea v-model="newCamp.description" placeholder="Beschreibung der Stelle..." rows="4"
              style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
          </div>
          <div class="auth-field">
            <label>Anforderungen</label>
            <textarea v-model="newCamp.requirements" placeholder="Was erwarten wir?" rows="3"
              style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
          </div>
          <button class="auth-btn" :disabled="saving" @click="addCampaign">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-speakerphone"></i> Kampagne erstellen</span>
          </button>
        </div>
      </div>
    </div>

    <!-- TOAST -->
    <div v-if="toast" class="toast-success">
      <i class="ti ti-circle-check"></i> {{ toast }}
    </div>

  </div>
</template>

<script setup lang="ts">
import { statusLabel, statusBadge } from '~/modules/hr'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const tab = ref('employees')

// ── Mitarbeiter ───────────────────────────────────────
const { data, refresh } = await useFetch('/api/hr')
const employees = computed(() => (data.value as any)?.employees || [])

const activeCount      = computed(() => employees.value.filter((e: any) => e.status === 'active').length)
const vacationCount    = computed(() => employees.value.filter((e: any) => e.status === 'vacation').length)
const offboardingCount = computed(() => employees.value.filter((e: any) => e.status === 'offboarding').length)

const showAdd = ref(false)
const saving  = ref(false)
const newEmp  = reactive({ firstName: '', lastName: '', email: '', department: '', role: '', startDate: '' })

const userId = ref('demo-user')
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userId.value = u.userId
})

async function addEmployee() {
  saving.value = true
  await $fetch('/api/hr', { method: 'POST', body: { ...newEmp, userId: userId.value, status: 'active' } })
  await refresh()
  showAdd.value = false
  Object.assign(newEmp, { firstName: '', lastName: '', email: '', department: '', role: '', startDate: '' })
  saving.value = false
}

// ── Recruiting ────────────────────────────────────────
const { data: campData, refresh: refreshCamps } = await useFetch('/api/hr/campaigns')
const campaigns = computed(() => (campData.value as any)?.campaigns || [])

const activeCampaigns   = computed(() => campaigns.value.filter((c: any) => c.status === 'active').length)
const allApplications   = ref<any[]>([])
const totalApplications = computed(() => allApplications.value.length)

const selectedCampaign    = ref<any>(null)
const selectedApplications = ref<any[]>([])
const showCampaign = ref(false)
const toast        = ref('')

const typeLabel: Record<string, string> = {
  fulltime: 'Vollzeit', parttime: 'Teilzeit', internship: 'Praktikum', freelance: 'Freelance'
}

const newCamp = reactive({ title: '', department: '', location: '', type: 'fulltime', description: '', requirements: '' })

function applicationCount(campaignId: string) {
  return allApplications.value.filter((a: any) => a.campaignId === campaignId).length
}

async function viewApplications(campaign: any) {
  selectedCampaign.value = campaign
  const data = await $fetch(`/api/hr/campaigns/${campaign.campaignId}/applications`) as any
  selectedApplications.value = data.applications || []
  allApplications.value = [...allApplications.value.filter((a: any) => a.campaignId !== campaign.campaignId), ...selectedApplications.value]
}

function copyLink(campaignId: string) {
  const link = `${window.location.origin}/jobs/${campaignId}`
  navigator.clipboard.writeText(link)
  toast.value = `Link kopiert: ${link}`
  setTimeout(() => toast.value = '', 3500)
}

function showToast(msg: string) {
  toast.value = msg
  setTimeout(() => toast.value = '', 3500)
}

async function addCampaign() {
  saving.value = true
  try {
    await $fetch('/api/hr/campaigns', { method: 'POST', body: { ...newCamp, userId: userId.value } })
    await refreshCamps()
    showCampaign.value = false
    Object.assign(newCamp, { title: '', department: '', location: '', type: 'fulltime', description: '', requirements: '' })
    showToast('Kampagne erstellt!')
  } finally {
    saving.value = false
  }
}
</script>
