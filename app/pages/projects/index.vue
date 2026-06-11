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
        <div class="stat-value" style="color:#E05C5C">{{ overdueCount }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> sofort handeln</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-users stat-icon"></i>
        <div class="stat-label">Team Members</div>
        <div class="stat-value">{{ totalMembers }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> aktiv zugewiesen</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Projekte</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
          <i class="ti ti-plus"></i> Neues Projekt
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Projekt</th><th>Team</th><th>Deadline</th><th>Fortschritt</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="p in projects" :key="p.id" :style="p.status==='overdue'?'background:rgba(224,92,92,0.04)':''">
            <td class="td-name">{{ p.name }}</td>
            <td style="font-size:12px">{{ p.team }}</td>
            <td style="font-size:12px" :style="p.status==='overdue'?'color:#E05C5C;font-weight:600':''">{{ p.deadline }}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1"><div class="progress-bar"><div class="progress-fill" :class="p.progress===100?'cyan':''" :style="{width:p.progress+'%'}"></div></div></div>
                <span style="font-size:11px;color:var(--text-muted)">{{ p.progress }}%</span>
              </div>
            </td>
            <td><span class="badge" :class="statusBadge(p.status)">{{ statusLabel(p.status) }}</span></td>
            <td>
              <button class="icon-btn" style="width:28px;height:28px;font-size:14px" @click="editProject(p)" title="Bearbeiten">
                <i class="ti ti-pencil"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ADD MODAL -->
    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Neues Projekt</span>
          <button class="icon-btn" @click="showAdd=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Projektname</label><input v-model="newProj.name" placeholder="Projekt XY" /></div>
          <div class="auth-field"><label>Team</label><input v-model="newProj.team" placeholder="Engineering" /></div>
          <div class="auth-field"><label>Deadline</label><input v-model="newProj.deadline" type="date" /></div>
          <div class="auth-field">
            <label>Status</label>
            <select v-model="newProj.status" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none">
              <option value="active">Aktiv</option>
              <option value="review">Review</option>
              <option value="done">Abgeschlossen</option>
              <option value="overdue">In Verzug</option>
            </select>
          </div>
          <button class="auth-btn" @click="addProject">Projekt speichern</button>
        </div>
      </div>
    </div>

    <!-- EDIT MODAL -->
    <div v-if="editProj" class="modal-overlay" @click.self="editProj=null">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Projekt bearbeiten</span>
          <button class="icon-btn" @click="editProj=null"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Projektname</label><input v-model="editProj.name" /></div>
          <div class="auth-field"><label>Team</label><input v-model="editProj.team" /></div>
          <div class="auth-field"><label>Deadline</label><input v-model="editProj.deadline" type="date" /></div>
          <div class="auth-field">
            <label>Fortschritt %</label>
            <input v-model.number="editProj.progress" type="range" min="0" max="100" step="5" style="width:100%;accent-color:var(--accent)" />
            <div style="text-align:center;font-size:13px;color:var(--accent);font-weight:600">{{ editProj.progress }}%</div>
          </div>
          <div class="auth-field">
            <label>Status</label>
            <select v-model="editProj.status" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none">
              <option value="active">Aktiv</option>
              <option value="review">Review</option>
              <option value="done">Abgeschlossen</option>
              <option value="overdue">In Verzug</option>
            </select>
          </div>
          <button class="auth-btn" @click="saveEdit">Änderungen speichern</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const showAdd = ref(false)
const editProj = ref<any>(null)
const newProj  = reactive({ name: '', team: '', deadline: '', status: 'active' })

const projects = ref([
  { id: 1, name: 'Plexora Dashboard v2',  team: 'Engineering', deadline: '2026-07-31', progress: 72,  status: 'active'  },
  { id: 2, name: 'Cloudflare Migration',  team: 'DevOps',       deadline: '2026-06-30', progress: 45,  status: 'active'  },
  { id: 3, name: 'CRM Modul Ausbau',      team: 'Product',      deadline: '2026-08-15', progress: 30,  status: 'active'  },
  { id: 4, name: 'Q1 Kundenberichte',     team: 'Sales',        deadline: '2026-05-15', progress: 100, status: 'done'    },
  { id: 5, name: 'DSGVO Audit 2026',      team: 'Legal',        deadline: '2026-06-01', progress: 15,  status: 'overdue' },
])

const activeCount  = computed(() => projects.value.filter(p => p.status === 'active').length)
const doneCount    = computed(() => projects.value.filter(p => p.status === 'done').length)
const overdueCount = computed(() => projects.value.filter(p => p.status === 'overdue').length)
const totalMembers = computed(() => projects.value.length * 3)

const statusLabel = (s: string) => ({ active: 'Aktiv', review: 'Review', done: 'Fertig', overdue: 'Verzug' }[s] || s)
const statusBadge = (s: string) => ({ active: 'badge-info', review: 'badge-warning', done: 'badge-success', overdue: 'badge-danger' }[s] || 'badge-info')

function addProject() {
  projects.value.push({ id: Date.now(), ...newProj, progress: 0 })
  showAdd.value = false
  Object.assign(newProj, { name: '', team: '', deadline: '', status: 'active' })
}

function editProject(p: any) {
  editProj.value = { ...p }
}

function saveEdit() {
  const idx = projects.value.findIndex(p => p.id === editProj.value.id)
  if (idx !== -1) projects.value[idx] = { ...editProj.value }
  editProj.value = null
}
</script>
