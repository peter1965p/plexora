<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-layout-kanban stat-icon"></i>
        <div class="stat-label">Projekte gesamt</div>
        <div class="stat-value">{{ projects.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ activeCount }} aktiv</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-check stat-icon"></i>
        <div class="stat-label">Abgeschlossen</div>
        <div class="stat-value">{{ doneCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> diesen Monat</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-clock stat-icon"></i>
        <div class="stat-label">In Verzug</div>
        <div class="stat-value" :style="overdueCount > 0 ? 'color:#E05C5C' : ''">{{ overdueCount }}</div>
        <div class="stat-delta" :class="overdueCount > 0 ? 'down' : 'up'">
          <i class="ti" :class="overdueCount > 0 ? 'ti-alert-triangle' : 'ti-check'"></i>
          {{ overdueCount > 0 ? 'sofort handeln' : 'alles im Plan' }}
        </div>
      </div>
      <div class="stat-card">
        <i class="ti ti-building stat-icon"></i>
        <div class="stat-label">Mandanten</div>
        <div class="stat-value">{{ uniqueClients }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> aktive Kunden</div>
      </div>
    </div>

    <!-- FILTER -->
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center">
      <select v-model="filterCompany" class="form-select" style="max-width:220px">
        <option value="">Alle Mandanten</option>
        <option v-for="co in companies" :key="co.companyId" :value="co.companyId">{{ co.name }}</option>
      </select>
      <select v-model="filterStatus" class="form-select" style="max-width:160px">
        <option value="">Alle Status</option>
        <option value="active">Aktiv</option>
        <option value="review">Review</option>
        <option value="done">Abgeschlossen</option>
        <option value="overdue">In Verzug</option>
      </select>
      <button v-if="filterCompany || filterStatus" class="icon-btn" @click="filterCompany='';filterStatus=''" title="Filter zurücksetzen">
        <i class="ti ti-x"></i>
      </button>
      <div style="margin-left:auto;display:flex;gap:8px">
        <button class="icon-btn" title="Als CSV exportieren" @click="exportCsv"><i class="ti ti-file-type-csv"></i></button>
        <button class="icon-btn" title="Als Excel exportieren" @click="exportXlsx"><i class="ti ti-file-spreadsheet"></i></button>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openAdd">
          <i class="ti ti-plus"></i> Neues Projekt
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Projekte</span>
        <span style="font-size:12px;color:var(--text-muted)">{{ filtered.length }} von {{ projects.length }}</span>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Projekt</th><th>Mandant</th><th>Team</th><th>Deadline</th><th>Fortschritt</th><th>Prio</th><th>Status</th><th style="width:80px"></th></tr>
        </thead>
        <tbody>
          <tr v-if="!filtered.length">
            <td colspan="8" style="text-align:center;color:var(--text-muted);padding:24px">Keine Projekte gefunden</td>
          </tr>
          <tr v-for="p in filtered" :key="p.projectId" :style="p.status==='overdue'?'background:rgba(224,92,92,0.04)':''">
            <td class="td-name">{{ p.name }}</td>
            <td style="font-size:12px">{{ companyName(p.companyId) }}</td>
            <td style="font-size:12px">{{ p.team || '—' }}</td>
            <td style="font-size:12px" :style="p.status==='overdue'?'color:#E05C5C;font-weight:600':''">
              {{ p.deadline ? fmtDate(p.deadline) : '—' }}
            </td>
            <td style="min-width:120px">
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1"><div class="progress-bar"><div class="progress-fill" :class="p.progress===100?'cyan':''" :style="{width:(p.progress||0)+'%'}"></div></div></div>
                <span style="font-size:11px;color:var(--text-muted)">{{ p.progress || 0 }}%</span>
              </div>
            </td>
            <td><span class="badge" :class="priorityBadge(p.priority)">{{ priorityLabel(p.priority) }}</span></td>
            <td><span class="badge" :class="statusBadge(p.status)">{{ statusLabel(p.status) }}</span></td>
            <td>
              <div style="display:flex;gap:4px">
                <button class="icon-btn" @click="openEdit(p)"><i class="ti ti-pencil"></i></button>
                <button class="icon-btn" style="color:var(--danger)" @click="deleteProject(p)"><i class="ti ti-trash"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ADD/EDIT MODAL -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ editing ? 'Projekt bearbeiten' : 'Neues Projekt' }}</span>
          <button class="icon-btn" @click="showModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Projektname</label><input v-model="form.name" placeholder="Projekt XY" /></div>
          <div class="auth-field"><label>Beschreibung</label><input v-model="form.description" placeholder="Kurzbeschreibung..." /></div>

          <div class="auth-field">
            <label>Mandant (Unternehmen)</label>
            <select v-model="form.companyId" class="form-select">
              <option value="">— kein Mandant —</option>
              <option v-for="co in companies" :key="co.companyId" :value="co.companyId">{{ co.name }}</option>
            </select>
          </div>
          <div class="auth-field">
            <label>Ansprechpartner</label>
            <select v-model="form.contactId" class="form-select">
              <option value="">— kein Kontakt —</option>
              <option v-for="ct in contacts" :key="ct.contactId" :value="ct.contactId">{{ ct.firstName }} {{ ct.lastName }}</option>
            </select>
          </div>

          <div class="auth-row">
            <div class="auth-field"><label>Team</label><input v-model="form.team" placeholder="Engineering" /></div>
            <div class="auth-field"><label>Deadline</label><input v-model="form.deadline" type="date" /></div>
          </div>

          <div class="auth-row">
            <div class="auth-field">
              <label>Priorität</label>
              <select v-model="form.priority" class="form-select">
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
                <option value="critical">Kritisch</option>
              </select>
            </div>
            <div class="auth-field">
              <label>Status</label>
              <select v-model="form.status" class="form-select">
                <option value="active">Aktiv</option>
                <option value="review">Review</option>
                <option value="done">Abgeschlossen</option>
                <option value="overdue">In Verzug</option>
              </select>
            </div>
          </div>

          <div class="auth-field" v-if="editing">
            <label>Fortschritt {{ form.progress }}%</label>
            <input v-model.number="form.progress" type="range" min="0" max="100" step="5" style="width:100%;accent-color:var(--accent)" />
          </div>

          <div class="auth-field"><label>Notizen</label><textarea v-model="form.notes" rows="2" placeholder="Interne Notizen..."></textarea></div>

          <button class="auth-btn" :disabled="saving || !form.name" @click="save">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editing ? 'Speichern' : 'Projekt anlegen' }}</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { exportToCsv, exportToXlsx } from '~/modules/export'
import type { Company } from '~/modules/companies'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const userId = ref('demo-user')
onMounted(async () => {
  const { useAuthUser } = await import('~/composables/useAuth')
  const u = await useAuthUser()
  userId.value = u.userId
})

const { data: projectsData, refresh } = await useFetch(useApiUrl('/api/projects'), { getCachedData: () => undefined })
const { data: companiesData }         = await useFetch(useApiUrl('/api/companies'))
const { data: contactsData }          = await useFetch(useApiUrl('/api/contacts'))

const projects = computed(() => (projectsData.value as any)?.projects || [])
const companies = computed(() => (companiesData.value as any)?.companies || [])
const contacts  = computed(() => (contactsData.value as any)?.contacts  || [])

// Stats
const activeCount  = computed(() => projects.value.filter((p: any) => p.status === 'active').length)
const doneCount    = computed(() => projects.value.filter((p: any) => p.status === 'done').length)
const overdueCount = computed(() => projects.value.filter((p: any) => p.status === 'overdue').length)
const uniqueClients = computed(() => new Set(projects.value.filter((p: any) => p.companyId).map((p: any) => p.companyId)).size)

// Filter
const filterCompany = ref('')
const filterStatus  = ref('')
const filtered = computed(() => projects.value.filter((p: any) => {
  if (filterCompany.value && p.companyId !== filterCompany.value) return false
  if (filterStatus.value  && p.status    !== filterStatus.value)  return false
  return true
}))

// Helpers
function companyName(companyId?: string): string {
  if (!companyId) return '—'
  return companies.value.find((c: Company) => c.companyId === companyId)?.name || '—'
}

function fmtDate(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString('de-DE') : '—'
}

const statusLabel = (s: string) => ({ active: 'Aktiv', review: 'Review', done: 'Fertig', overdue: 'Verzug' }[s] || s)
const statusBadge = (s: string) => ({ active: 'badge-info', review: 'badge-warning', done: 'badge-success', overdue: 'badge-danger' }[s] || 'badge-info')
const priorityLabel = (p: string) => ({ low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' }[p || 'medium'] || p)
const priorityBadge = (p: string) => ({ low: 'badge-info', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' }[p || 'medium'] || 'badge-info')

// Export
function exportRows() {
  return projects.value.map((p: any) => ({
    Projekt:     p.name,
    Beschreibung: p.description || '',
    Mandant:     companyName(p.companyId),
    Team:        p.team || '',
    Deadline:    p.deadline ? fmtDate(p.deadline) : '',
    Fortschritt: `${p.progress || 0}%`,
    Priorität:   priorityLabel(p.priority),
    Status:      statusLabel(p.status),
    Erstellt:    p.created ? new Date(p.created).toLocaleDateString('de-DE') : '',
  }))
}
function exportCsv()  { exportToCsv(`projekte-${new Date().toISOString().slice(0,10)}.csv`, exportRows()) }
function exportXlsx() { exportToXlsx(`projekte-${new Date().toISOString().slice(0,10)}.xlsx`, exportRows(), 'Projekte') }

// Modal
const showModal = ref(false)
const editing   = ref<any>(null)
const saving    = ref(false)
const form = reactive({
  name: '', description: '', companyId: '', contactId: '',
  team: '', deadline: '', progress: 0,
  priority: 'medium', status: 'active', notes: '',
})

function resetForm() {
  Object.assign(form, {
    name: '', description: '', companyId: '', contactId: '',
    team: '', deadline: '', progress: 0,
    priority: 'medium', status: 'active', notes: '',
  })
}

function openAdd() {
  editing.value = null
  resetForm()
  showModal.value = true
}

function openEdit(p: any) {
  editing.value = p
  Object.assign(form, {
    name: p.name, description: p.description || '',
    companyId: p.companyId || '', contactId: p.contactId || '',
    team: p.team || '', deadline: p.deadline || '',
    progress: p.progress ?? 0,
    priority: p.priority || 'medium', status: p.status, notes: p.notes || '',
  })
  showModal.value = true
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(useApiUrl(`/api/projects/${editing.value.projectId}`), {
        method: 'PATCH', body: { ...form, userId: userId.value }
      })
    } else {
      await $fetch(useApiUrl('/api/projects'), {
        method: 'POST', body: { ...form, userId: userId.value }
      })
    }
    await refresh()
    showModal.value = false
  } finally {
    saving.value = false
  }
}

async function deleteProject(p: any) {
  if (!confirm(`Projekt "${p.name}" wirklich löschen?`)) return
  await $fetch(useApiUrl(`/api/projects/${p.projectId}`), { method: 'DELETE' })
  await refresh()
}
</script>
