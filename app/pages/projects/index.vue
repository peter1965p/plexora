<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card"><i class="ti ti-layout-kanban stat-icon"></i><div class="stat-label">{{ t.moduleNames.projects }}</div><div class="stat-value">{{ projects.length }}</div><div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ activeCount }} {{ t.projects.active }}</div></div>
      <div class="stat-card"><i class="ti ti-check stat-icon"></i><div class="stat-label">{{ t.projects.completed }}</div><div class="stat-value">{{ doneCount }}</div><div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ t.projects.thisMonth }}</div></div>
      <div class="stat-card"><i class="ti ti-clock stat-icon"></i><div class="stat-label">{{ t.projects.overdue }}</div><div class="stat-value" :style="overdueCount>0?'color:#E05C5C':''">{{ overdueCount }}</div><div class="stat-delta" :class="overdueCount>0?'down':'up'"><i class="ti" :class="overdueCount>0?'ti-alert-triangle':'ti-check'"></i> {{ overdueCount>0 ? t.projects.actNow : t.projects.onTrack }}</div></div>
      <div class="stat-card"><i class="ti ti-list-check stat-icon"></i><div class="stat-label">{{ t.projects.openTasks }}</div><div class="stat-value">{{ openTaskCount }}</div><div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ t.projects.total }}</div></div>
    </div>

    <!-- VIEW TABS + ACTIONS -->
    <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap">
      <button class="theme-opt" :class="{active:view==='list'}"  @click="view='list'">  <i class="ti ti-list"></i> {{ t.projects.listView }}</button>
      <button class="theme-opt" :class="{active:view==='gantt'}" @click="view='gantt'"> <i class="ti ti-chart-gantt"></i> {{ t.projects.ganttView }}</button>
      <div style="margin-left:auto;display:flex;gap:8px">
        <button class="icon-btn" @click="exportCsv"><i class="ti ti-file-type-csv"></i></button>
        <button class="icon-btn" @click="exportXlsx"><i class="ti ti-file-spreadsheet"></i></button>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="openAdd">
          <i class="ti ti-plus"></i> {{ t.projects.newProject }}
        </button>
      </div>
    </div>

    <!-- ═══ LISTE ═══ -->
    <div v-if="view==='list'">
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <select v-model="filterStatus" class="form-select" style="max-width:160px">
          <option value="">{{ t.projects.allStatus }}</option>
          <option value="active">{{ t.projects.statusActive }}</option><option value="review">{{ t.projects.statusReview }}</option>
          <option value="done">{{ t.projects.statusCompleted }}</option><option value="overdue">{{ t.projects.statusOverdue }}</option>
        </select>
        <button v-if="filterStatus" class="icon-btn" @click="filterStatus=''"><i class="ti ti-x"></i></button>
      </div>

      <div v-for="p in filtered" :key="p.projectId" class="project-block">
        <div class="project-block-header" @click="toggleExpand(p.projectId)">
          <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
            <i class="ti" :class="expanded.has(p.projectId)?'ti-chevron-down':'ti-chevron-right'" style="color:var(--text-muted);font-size:12px;flex-shrink:0"></i>
            <span class="td-name">{{ p.name }}</span>
            <span style="font-size:11px;color:var(--text-muted)">{{ companyName(p.companyId) }}</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
            <div style="width:80px"><div class="progress-bar"><div class="progress-fill" :class="p.progress===100?'cyan':''" :style="{width:(p.progress||0)+'%'}"></div></div></div>
            <span style="font-size:11px;color:var(--text-muted)">{{ p.progress||0 }}%</span>
            <span class="badge" :class="statusBadge(p.status)">{{ statusLabel(p.status) }}</span>
            <span class="badge" :class="priorityBadge(p.priority)">{{ priorityLabel(p.priority) }}</span>
            <span v-if="p.deadline" style="font-size:11px;color:var(--text-muted)">{{ fmtDate(p.deadline) }}</span>
            <button class="icon-btn" style="font-size:11px" @click.stop="openEdit(p)"><i class="ti ti-pencil"></i></button>
            <button class="icon-btn" style="font-size:11px;color:var(--danger)" @click.stop="deleteProject(p)"><i class="ti ti-trash"></i></button>
          </div>
        </div>

        <!-- TASKS PANEL -->
        <div v-if="expanded.has(p.projectId)" class="project-tasks">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span style="font-size:12px;font-weight:600;color:var(--text-muted)">{{ t.projects.colTasks }} ({{ (p.tasks||[]).length }})</span>
            <button class="accent-btn" style="height:24px;font-size:11px;padding:0 10px" @click="openAddTask(p)">
              <i class="ti ti-plus"></i> {{ t.projects.task }}
            </button>
          </div>
          <div v-if="!(p.tasks||[]).length" style="font-size:12px;color:var(--text-muted);padding:8px 0">{{ t.projects.noTasks }}</div>
          <div v-for="tk in p.tasks||[]" :key="tk.taskId" class="task-card">
            <div style="display:flex;align-items:flex-start;gap:8px">
              <input type="checkbox" :checked="tk.status==='done'" @change="toggleTaskDone(p,tk)" style="margin-top:2px;accent-color:var(--accent);flex-shrink:0" />
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  <span style="font-size:13px;font-weight:500" :style="tk.status==='done'?'text-decoration:line-through;color:var(--text-muted)':''">{{ tk.title }}</span>
                  <span class="badge" :class="priorityBadge(tk.priority)" style="font-size:10px;padding:1px 6px">{{ priorityLabel(tk.priority) }}</span>
                  <span v-if="tk.assignee" style="font-size:11px;color:var(--text-muted)"><i class="ti ti-user"></i> {{ tk.assignee }}</span>
                  <span v-if="tk.endDate" style="font-size:11px;color:var(--text-muted)"><i class="ti ti-calendar"></i> {{ fmtDate(tk.endDate) }}</span>
                  <span v-if="tk.estimatedHours" style="font-size:11px;color:var(--text-muted)">{{ (tk.loggedHours||0).toFixed(1) }}/{{ tk.estimatedHours }}h</span>
                </div>

                <!-- SUBTASKS -->
                <div v-if="tk.subtasks?.length" style="margin-top:6px;display:flex;flex-direction:column;gap:4px">
                  <label v-for="s in tk.subtasks" :key="s.id" style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-muted);cursor:pointer">
                    <input type="checkbox" :checked="s.done" @change="toggleSubtask(p,tk,s)" style="accent-color:var(--accent)" />
                    <span :style="s.done?'text-decoration:line-through;opacity:0.5':''">{{ s.text }}</span>
                  </label>
                </div>

                <!-- COMMENTS -->
                <div v-if="tk.comments?.length" style="margin-top:8px;display:flex;flex-direction:column;gap:4px">
                  <div v-for="c in tk.comments" :key="c.id" style="font-size:12px;background:var(--bg-elevated);border-radius:6px;padding:6px 10px">
                    <span style="color:var(--accent);font-weight:600">{{ c.author }}: </span>{{ c.text }}
                    <span style="color:var(--text-muted);margin-left:6px;font-size:10px">{{ new Date(c.created).toLocaleDateString('de-DE') }}</span>
                  </div>
                </div>

                <!-- TASK ACTIONS -->
                <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">
                  <button class="icon-btn" style="font-size:11px;padding:0 8px;height:22px" @click="openAddSubtask(p,tk)"><i class="ti ti-list-check"></i> {{ t.projects.subtask }}</button>
                  <button class="icon-btn" style="font-size:11px;padding:0 8px;height:22px" @click="openAddComment(p,tk)"><i class="ti ti-message"></i> {{ t.projects.comment }}</button>
                  <button class="icon-btn" style="font-size:11px;padding:0 8px;height:22px" @click="openLogTime(p,tk)"><i class="ti ti-clock"></i> {{ t.projects.time }}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ GANTT / PLANER ═══ -->
    <div v-if="view==='gantt'" class="card">
      <div class="card-header"><span class="card-title">{{ t.projects.ganttTitle }}</span></div>
      <div v-if="ganttProjects.length === 0" style="text-align:center;color:var(--text-muted);padding:40px">
        {{ t.projects.ganttEmpty }}
      </div>
      <div v-else style="overflow-x:auto;padding:0 16px 16px">
        <!-- DATE HEADER -->
        <div class="gantt-grid" :style="{ gridTemplateColumns: `200px repeat(${ganttWeeks}, 1fr)` }">
          <div class="gantt-label-cell" style="font-size:11px;color:var(--text-muted);padding-bottom:6px">{{ t.projects.projectTask }}</div>
          <div v-for="w in ganttWeekLabels" :key="w.iso" class="gantt-week-cell" :class="{ 'gantt-today-col': w.isThisWeek }">
            {{ w.label }}
          </div>

          <!-- PROJECT ROWS -->
          <template v-for="p in ganttProjects" :key="p.projectId">
            <div class="gantt-label-cell" style="font-weight:600;font-size:13px">
              <span :class="statusBadge(p.status)" class="badge" style="margin-right:6px;font-size:10px"></span>{{ p.name }}
            </div>
            <div v-for="w in ganttWeekLabels" :key="w.iso" class="gantt-cell" :class="{ 'gantt-today-col': w.isThisWeek }">
              <div v-if="ganttBar(p, w)" class="gantt-bar-fill" :style="ganttBarStyle(p,w)" :title="p.name"></div>
            </div>

            <!-- TASK ROWS in Gantt -->
            <template v-for="tk in (p.tasks||[]).filter((t:any) => t.endDate)" :key="tk.taskId">
              <div class="gantt-label-cell" style="font-size:12px;color:var(--text-muted);padding-left:20px">
                <i class="ti ti-circle" style="font-size:8px;margin-right:4px"></i>{{ tk.title }}
              </div>
              <div v-for="w in ganttWeekLabels" :key="w.iso" class="gantt-cell">
                <div v-if="ganttTaskBar(tk,w)" class="gantt-bar-fill task-bar" :style="ganttTaskBarStyle(tk,w)"></div>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- ADD/EDIT PROJECT MODAL -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ editing ? t.projects.editProject : t.projects.newProject }}</span>
          <button class="icon-btn" @click="showModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>{{ t.projects.projectName }}</label><input v-model="form.name" placeholder="Projekt XY" /></div>
          <div class="auth-field"><label>{{ t.common.description }}</label><input v-model="form.description" placeholder="Kurzbeschreibung..." /></div>
          <div class="auth-field">
            <label>{{ t.projects.client }}</label>
            <select v-model="form.companyId" class="form-select">
              <option value="">{{ t.projects.noClient }}</option>
              <option v-for="co in companies" :key="co.companyId" :value="co.companyId">{{ co.name }}</option>
            </select>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.projects.team }}</label><input v-model="form.team" placeholder="Engineering" /></div>
            <div class="auth-field"><label>{{ t.projects.deadline }}</label><input v-model="form.deadline" type="date" /></div>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.projects.priority }}</label>
              <select v-model="form.priority" class="form-select">
                <option value="low">{{ t.common.low }}</option><option value="medium">{{ t.common.medium }}</option>
                <option value="high">{{ t.common.high }}</option><option value="critical">{{ t.common.critical }}</option>
              </select>
            </div>
            <div class="auth-field"><label>{{ t.common.status }}</label>
              <select v-model="form.status" class="form-select">
                <option value="active">{{ t.projects.statusActive }}</option><option value="review">{{ t.projects.statusReview }}</option>
                <option value="done">{{ t.projects.statusCompleted }}</option><option value="overdue">{{ t.projects.overdue }}</option>
              </select>
            </div>
          </div>
          <div v-if="editing" class="auth-field">
            <label>{{ t.projects.progress }} {{ form.progress }}%</label>
            <input v-model.number="form.progress" type="range" min="0" max="100" step="5" style="width:100%;accent-color:var(--accent)" />
          </div>
          <button class="auth-btn" :disabled="saving||!form.name" @click="save">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ editing ? t.common.save : t.projects.createProject }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ADD TASK MODAL -->
    <div v-if="showTaskModal" class="modal-overlay" @click.self="showTaskModal=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">{{ t.projects.newTask }} — {{ taskProject?.name }}</span>
          <button class="icon-btn" @click="showTaskModal=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>{{ t.projects.taskTitle }}</label><input v-model="newTask.title" placeholder="Task beschreiben..." /></div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.projects.assignee }}</label><input v-model="newTask.assignee" placeholder="Name..." /></div>
            <div class="auth-field"><label>{{ t.projects.priority }}</label>
              <select v-model="newTask.priority" class="form-select">
                <option value="low">{{ t.common.low }}</option><option value="medium">{{ t.common.medium }}</option>
                <option value="high">{{ t.common.high }}</option><option value="critical">{{ t.common.critical }}</option>
              </select>
            </div>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.projects.start }}</label><input v-model="newTask.startDate" type="date" /></div>
            <div class="auth-field"><label>{{ t.projects.deadline }}</label><input v-model="newTask.endDate" type="date" /></div>
          </div>
          <div class="auth-field"><label>{{ t.projects.estimatedHours }}</label><input v-model.number="newTask.estimatedHours" type="number" placeholder="0" /></div>
          <button class="auth-btn" :disabled="saving||!newTask.title" @click="addTask">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ t.projects.createTask }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- INLINE MODALS: Subtask / Comment / Time -->
    <div v-if="inlineModal" class="modal-overlay" @click.self="inlineModal=null">
      <div class="modal-card" style="max-width:400px">
        <div class="modal-header">
          <span class="card-title">
            {{ inlineModal.type==='subtask' ? t.projects.addSubtask : inlineModal.type==='comment' ? t.projects.comment : t.projects.bookTime }}
          </span>
          <button class="icon-btn" @click="inlineModal=null"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div v-if="inlineModal.type==='subtask'" class="auth-field">
            <label>{{ t.projects.subtask }}</label><input v-model="inlineText" placeholder="Was zu tun ist..." />
          </div>
          <div v-if="inlineModal.type==='comment'" class="auth-field">
            <label>{{ t.projects.comment }}</label>
            <textarea v-model="inlineText" rows="3" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none;resize:none;font-family:inherit"></textarea>
          </div>
          <div v-if="inlineModal.type==='time'" class="auth-field">
            <label>{{ t.projects.hours }}</label><input v-model.number="inlineHours" type="number" step="0.25" placeholder="1.5" />
          </div>
          <button class="auth-btn" :disabled="saving" @click="submitInline">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ t.common.save }}</span>
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
const { userId } = await useAuthUser()
const { t, lang } = useLang()

const { data: projectsData, refresh } = await useFetch(() => useApiUrl(`/api/projects?userId=${encodeURIComponent(userId)}`), { getCachedData: () => undefined })
const { data: companiesData }         = await useFetch(() => useApiUrl(`/api/companies?userId=${encodeURIComponent(userId)}`))

const projects  = computed(() => (projectsData.value as any)?.projects || [])
const companies = computed(() => (companiesData.value as any)?.companies || [])

const activeCount   = computed(() => projects.value.filter((p: any) => p.status === 'active').length)
const doneCount     = computed(() => projects.value.filter((p: any) => p.status === 'done').length)
const overdueCount  = computed(() => projects.value.filter((p: any) => p.status === 'overdue').length)
const openTaskCount = computed(() => projects.value.reduce((s: number, p: any) => s + (p.tasks||[]).filter((tk: any) => tk.status !== 'done').length, 0))

const view        = ref('list')
const filterStatus = ref('')
const expanded    = ref(new Set<string>())

const filtered = computed(() => projects.value.filter((p: any) => !filterStatus.value || p.status === filterStatus.value))

function toggleExpand(id: string) {
  if (expanded.value.has(id)) expanded.value.delete(id)
  else expanded.value.add(id)
  expanded.value = new Set(expanded.value)
}

const companyName = (id?: string) => id ? (companies.value.find((c: Company) => c.companyId === id)?.name || '—') : '—'
const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('de-DE') : '—'
const statusLabel  = (s: string) => ({ active: 'Aktiv', review: 'Review', done: 'Fertig', overdue: 'Verzug' }[s] || s)
const statusBadge  = (s: string) => ({ active: 'badge-info', review: 'badge-warning', done: 'badge-success', overdue: 'badge-danger' }[s] || '')
const priorityLabel = (p: string) => ({ low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' }[p || 'medium'] || p)
const priorityBadge = (p: string) => ({ low: 'badge-info', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' }[p || 'medium'] || '')

// ── GANTT ─────────────────────────────────────────────
const ganttProjects = computed(() => projects.value.filter((p: any) => p.deadline))

const ganttRange = computed(() => {
  const allDates = ganttProjects.value.flatMap((p: any) => [
    new Date(p.created || Date.now()),
    new Date(p.deadline),
    ...(p.tasks||[]).filter((tk: any) => tk.startDate).map((tk: any) => new Date(tk.startDate)),
    ...(p.tasks||[]).filter((tk: any) => tk.endDate).map((tk: any) => new Date(tk.endDate)),
  ])
  if (!allDates.length) return { start: new Date(), end: new Date() }
  const min = new Date(Math.min(...(allDates as Date[]).map((d: Date) => d.getTime())))
  const max = new Date(Math.max(...(allDates as Date[]).map((d: Date) => d.getTime())))
  min.setDate(min.getDate() - 3)
  max.setDate(max.getDate() + 7)
  return { start: min, end: max }
})

const ganttWeeks = computed(() => {
  const { start, end } = ganttRange.value
  return Math.ceil((end.getTime() - start.getTime()) / (7 * 86400000))
})

const ganttWeekLabels = computed(() => {
  const { start } = ganttRange.value
  const today = new Date()
  return Array.from({ length: ganttWeeks.value }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i * 7)
    const isThisWeek = Math.abs(d.getTime() - today.getTime()) < 7 * 86400000
    return { iso: d.toISOString(), label: `${d.getDate()}.${d.getMonth()+1}`, isThisWeek, date: d }
  })
})

function ganttBar(p: any, w: any) {
  const s = new Date(p.created || p.startDate || ganttRange.value.start)
  const e = new Date(p.deadline)
  return w.date >= s && w.date <= e
}
function ganttBarStyle(p: any, w: any) {
  const isStart = Math.abs(new Date(p.created||p.startDate||ganttRange.value.start).getTime() - w.date.getTime()) < 7*86400000
  const isEnd   = Math.abs(new Date(p.deadline).getTime() - w.date.getTime()) < 7*86400000
  return { borderRadius: isStart ? '6px 0 0 6px' : isEnd ? '0 6px 6px 0' : '0', background: 'var(--accent)', opacity: '0.85' }
}
function ganttTaskBar(tk: any, w: any) {
  const s = new Date(tk.startDate || ganttRange.value.start)
  const e = new Date(tk.endDate)
  return w.date >= s && w.date <= e
}
function ganttTaskBarStyle(tk: any, w: any) {
  const isStart = Math.abs(new Date(tk.startDate||ganttRange.value.start).getTime() - w.date.getTime()) < 7*86400000
  const isEnd   = Math.abs(new Date(tk.endDate).getTime() - w.date.getTime()) < 7*86400000
  return { borderRadius: isStart ? '4px 0 0 4px' : isEnd ? '0 4px 4px 0' : '0' }
}

// ── PROJECT CRUD ──────────────────────────────────────
const route     = useRoute()
const showModal = ref(false)
const editing   = ref<any>(null)
const saving    = ref(false)
const form = reactive({ name:'', description:'', companyId:'', team:'', deadline:'', progress:0, priority:'medium', status:'active', notes:'' })

onMounted(() => { if (route.query.new) showModal.value = true })

const resetForm = () => Object.assign(form, { name:'', description:'', companyId:'', team:'', deadline:'', progress:0, priority:'medium', status:'active', notes:'' })
const openAdd  = () => { editing.value=null; resetForm(); showModal.value=true }
const openEdit = (p: any) => { editing.value=p; Object.assign(form, { name:p.name, description:p.description||'', companyId:p.companyId||'', team:p.team||'', deadline:p.deadline||'', progress:p.progress??0, priority:p.priority||'medium', status:p.status, notes:p.notes||'' }); showModal.value=true }

async function save() {
  saving.value = true
  try {
    if (editing.value) await $fetch(useApiUrl(`/api/projects/${editing.value.projectId}`), { method:'PATCH', body:{ ...form, userId } })
    else               await $fetch(useApiUrl('/api/projects'), { method:'POST', body:{ ...form, userId } })
    await refresh(); showModal.value=false
  } finally { saving.value=false }
}
const { openConfirm } = useConfirm()

async function deleteProject(p: any) {
  if (!await openConfirm({ title: 'Projekt löschen?', name: p.name })) return
  await $fetch(useApiUrl(`/api/projects/${p.projectId}`), { method:'DELETE' })
  await refresh()
}

// ── TASKS ─────────────────────────────────────────────
const showTaskModal = ref(false)
const taskProject   = ref<any>(null)
const newTask = reactive({ title:'', assignee:'', priority:'medium', startDate: new Date().toISOString().slice(0,10), endDate:'', estimatedHours:0 })

function openAddTask(p: any) { taskProject.value=p; Object.assign(newTask, { title:'', assignee:'', priority:'medium', startDate: new Date().toISOString().slice(0,10), endDate:'', estimatedHours:0 }); showTaskModal.value=true }

async function addTask() {
  saving.value = true
  try {
    await $fetch(useApiUrl(`/api/projects/${taskProject.value.projectId}/tasks`), {
      method:'POST', body:{ ...newTask, userId }
    })
    await refresh(); showTaskModal.value=false
    expanded.value.add(taskProject.value.projectId)
    expanded.value = new Set(expanded.value)
  } finally { saving.value=false }
}

async function toggleTaskDone(p: any, tk: any) {
  await $fetch(useApiUrl(`/api/projects/${p.projectId}/tasks/${tk.taskId}`), {
    method:'PATCH', body:{ status: tk.status==='done' ? 'todo' : 'done', userId }
  })
  await refresh()
}

// ── INLINE MODALS ─────────────────────────────────────
const inlineModal = ref<{ type: string; project: any; task: any; subtask?: any } | null>(null)
const inlineText  = ref('')
const inlineHours = ref(0)

const openAddSubtask = (p: any, tk: any) => { inlineModal.value={type:'subtask',project:p,task:tk}; inlineText.value='' }
const openAddComment = (p: any, tk: any) => { inlineModal.value={type:'comment',project:p,task:tk}; inlineText.value='' }
const openLogTime    = (p: any, tk: any) => { inlineModal.value={type:'time',project:p,task:tk};    inlineHours.value=0 }

async function submitInline() {
  if (!inlineModal.value) return
  saving.value=true
  const { type, project, task } = inlineModal.value
  try {
    if (type==='subtask') await $fetch(useApiUrl(`/api/projects/${project.projectId}/tasks/${task.taskId}`), { method:'PATCH', body:{ action:'add_subtask', text:inlineText.value, userId } })
    if (type==='comment') await $fetch(useApiUrl(`/api/projects/${project.projectId}/tasks/${task.taskId}`), { method:'PATCH', body:{ action:'add_comment', text:inlineText.value, author:'Team', userId } })
    if (type==='time')    await $fetch(useApiUrl(`/api/projects/${project.projectId}/tasks/${task.taskId}`), { method:'PATCH', body:{ action:'log_time', hours:inlineHours.value, userId } })
    await refresh()
    inlineModal.value=null
  } finally { saving.value=false }
}

async function toggleSubtask(p: any, tk: any, s: any) {
  await $fetch(useApiUrl(`/api/projects/${p.projectId}/tasks/${tk.taskId}`), {
    method:'PATCH', body:{ action:'toggle_subtask', subtaskId:s.id, userId }
  })
  await refresh()
}

// ── EXPORT ────────────────────────────────────────────
const exportRows = () => projects.value.map((p: any) => ({ Projekt:p.name, Status:statusLabel(p.status), Priorität:priorityLabel(p.priority), Deadline:p.deadline?fmtDate(p.deadline):'', Fortschritt:`${p.progress||0}%`, Tasks:(p.tasks||[]).length }))
const exportCsv  = () => exportToCsv(`projekte-${new Date().toISOString().slice(0,10)}.csv`, exportRows())
const exportXlsx = () => exportToXlsx(`projekte-${new Date().toISOString().slice(0,10)}.xlsx`, exportRows(), 'Projekte')
</script>

<style scoped>
.project-block { background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
.project-block-header { padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
.project-block-header:hover { background: rgba(255,255,255,0.02); }
.project-tasks { padding: 8px 16px 16px 40px; border-top: 0.5px solid var(--border); background: rgba(0,0,0,0.1); }
.task-card { background: var(--bg-elevated); border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; }

/* GANTT */
.gantt-grid { display: grid; gap: 0; min-width: 600px; }
.gantt-label-cell { padding: 6px 8px; font-size: 13px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 0.5px solid var(--border); display: flex; align-items: center; }
.gantt-week-cell  { padding: 4px 2px; font-size: 10px; color: var(--text-muted); text-align: center; border-bottom: 0.5px solid var(--border); }
.gantt-cell       { height: 28px; position: relative; border-bottom: 0.5px solid rgba(255,255,255,0.03); }
.gantt-today-col  { background: rgba(234,88,12,0.04); }
.gantt-bar-fill   { position: absolute; top: 4px; bottom: 4px; left: 0; right: 0; background: var(--accent); border-radius: 4px; opacity: 0.8; }
.task-bar         { background: #6C3FE8 !important; opacity: 0.6 !important; top: 6px !important; bottom: 6px !important; }
</style>
