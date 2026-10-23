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
            <button class="icon-btn" style="font-size:11px" :title="t.projects.createInvoice" @click.stop="createInvoiceFromProject(p)"><i class="ti ti-file-invoice"></i></button>
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

    <!-- ═══ PLANER (Gantt) ═══ -->
    <div v-if="view==='gantt'" class="card">
      <div class="card-header" style="flex-wrap:wrap;gap:8px">
        <span class="card-title"><i class="ti ti-chart-gantt" style="margin-right:8px;color:var(--accent)"></i>{{ t.projects.ganttTitle }}</span>
        <select v-if="projects.length" v-model="planProjectId" class="form-select" style="height:30px;max-width:320px"><option v-for="p in projects" :key="p.projectId" :value="p.projectId">{{ p.name }}</option></select>
      </div>
      <div v-if="!projects.length" style="text-align:center;color:var(--text-muted);padding:40px">{{ tr('Lege zuerst ein Projekt an (Liste → „Neues Projekt“), dann planst du es hier als Gantt.') }}</div>
      <div v-else style="padding:0 16px 16px">
        <div v-if="planMsg" class="plan-msg" :class="{ err: planMsgErr }">{{ planMsg }}</div>
        <GanttChart :tasks="planTasks" @change="onPlanChange" @create="openPlanCreate" @edit="openPlanEdit" @error="m => say(m, true)" />
      </div>
    </div>

    <!-- VORGANG ANLEGEN / BEARBEITEN (Planer) -->
    <div v-if="planModal" class="modal-overlay" @click.self="planModal = null">
      <div class="modal-card" style="max-width:520px">
        <div class="modal-header"><span class="card-title">{{ planModal.mode === 'edit' ? (pf.milestone ? tr('Meilenstein bearbeiten') : tr('Vorgang bearbeiten')) : (pf.milestone ? tr('Neuer Meilenstein') : tr('Neuer Vorgang')) }}</span><button class="icon-btn" @click="planModal = null"><i class="ti ti-x"></i></button></div>
        <div class="modal-body">
          <div v-if="planErr" class="plan-msg err">{{ planErr }}</div>
          <div class="auth-field"><label>{{ tr('Bezeichnung *') }}</label><input v-model="pf.title" maxlength="120" /></div>
          <div class="auth-field"><label>{{ tr('Zuständig') }}</label><input v-model="pf.assignee" list="plan-people" maxlength="80" :placeholder="tr('Name oder E-Mail')" /><datalist id="plan-people"><option v-for="n in planPeople" :key="n" :value="n" /></datalist></div>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin:6px 0"><input type="checkbox" v-model="pf.milestone" :disabled="planModal.mode === 'edit' && false" /> {{ tr('Meilenstein (ein Termin ohne Dauer)') }}</label>
          <div class="auth-row"><div class="auth-field"><label>{{ pf.milestone ? tr('Datum') : tr('Beginn') }}</label><input v-model="pf.startDate" type="date" /></div><div v-if="!pf.milestone" class="auth-field"><label>{{ tr('Ende') }}</label><input v-model="pf.endDate" type="date" :min="pf.startDate" /></div></div>
          <template v-if="planModal.mode === 'edit'">
            <div class="auth-field"><label>{{ tr('Fortschritt:') }} {{ pf.progress }} %</label><input type="range" min="0" max="100" step="5" v-model.number="pf.progress" /></div>
            <div class="auth-field"><label>{{ tr('Vorgänger (muss fertig sein, bevor dieser Vorgang beginnt)') }}</label>
              <div style="display:flex;flex-direction:column;gap:4px;max-height:140px;overflow:auto;border:0.5px solid var(--border);border-radius:8px;padding:8px">
                <label v-for="o in planOthers" :key="o.taskId" style="display:flex;gap:8px;font-size:13px;align-items:center"><input type="checkbox" :value="o.taskId" v-model="pf.predecessors" /> {{ o.title }}</label>
                <span v-if="!planOthers.length" style="font-size:12px;color:var(--text-muted)">{{ tr('Es gibt noch keine anderen Vorgänge.') }}</span>
              </div>
            </div>
          </template>
          <div style="display:flex;gap:8px;margin-top:8px"><button class="auth-btn" :disabled="planSaving || !pf.title.trim()" style="flex:1" @click="savePlanModal"><i class="ti" :class="planSaving ? 'ti-loader-2 spin' : 'ti-device-floppy'"></i> {{ tr('Speichern') }}</button><button v-if="planModal.mode === 'edit'" class="auth-btn" style="flex:0 0 auto;background:#E05C5C" :disabled="planSaving" @click="deletePlanTask"><i class="ti ti-trash"></i></button></div>
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
          <div class="auth-field"><label>{{ t.projects.projectName }}</label><input v-model="form.name" :placeholder="tr('Projekt XY')" /></div>
          <div class="auth-field"><label>{{ t.common.description }}</label><input v-model="form.description" :placeholder="tr('Kurzbeschreibung...')" /></div>
          <div class="auth-field">
            <label>{{ t.projects.client }}</label>
            <select v-model="form.companyId" class="form-select">
              <option value="">{{ t.projects.noClient }}</option>
              <option v-for="co in companies" :key="co.companyId" :value="co.companyId">{{ co.name }}</option>
            </select>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.projects.team }}</label><input v-model="form.team" :placeholder="tr('Engineering')" /></div>
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
          <div class="auth-field"><label>{{ t.projects.taskTitle }}</label><input v-model="newTask.title" :placeholder="tr('Task beschreiben...')" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.projects.assignee }}</label><input v-model="newTask.assignee" :placeholder="tr('Name...')" /></div>
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
            <label>{{ t.projects.subtask }}</label><input v-model="inlineText" :placeholder="tr('Was zu tun ist...')" />
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
const { userId, idToken } = await useAuthUser()
const authHeaders = { Authorization: `Bearer ${idToken}` }
const { t, lang } = useLang()

const { data: projectsData, refresh } = await useFetch(() => useApiUrl(`/api/projects?userId=${encodeURIComponent(userId)}`), { getCachedData: () => undefined, headers: authHeaders })
const { data: companiesData }         = await useFetch(() => useApiUrl(`/api/companies?userId=${encodeURIComponent(userId)}`), { headers: authHeaders })

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
function createInvoiceFromProject(p: any) {
  const co = companies.value.find((c: Company) => c.companyId === p.companyId)
  navigateTo({ path: '/finance', query: { new: '1', client: co?.name || '', clientEmail: co?.email || '', description: p.name } })
}
const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('de-DE') : '—'
const statusLabel  = (s: string) => ({ active: 'Aktiv', review: 'Review', done: 'Fertig', overdue: 'Verzug' }[s] || s)
const statusBadge  = (s: string) => ({ active: 'badge-info', review: 'badge-warning', done: 'badge-success', overdue: 'badge-danger' }[s] || '')
const priorityLabel = (p: string) => ({ low: 'Niedrig', medium: 'Mittel', high: 'Hoch', critical: 'Kritisch' }[p || 'medium'] || p)
const priorityBadge = (p: string) => ({ low: 'badge-info', medium: 'badge-warning', high: 'badge-danger', critical: 'badge-danger' }[p || 'medium'] || '')

// ── PLANER (Gantt) ────────────────────────────────────
import { applyScheduleChanges, isIsoDate, addDays as ganttAddDays, GanttError } from '~~/shared/gantt'
const planProjectId = ref('')
const planMsg = ref(''), planMsgErr = ref(false)
const say = (m: string, err = false) => { planMsg.value = m; planMsgErr.value = err; setTimeout(() => { if (planMsg.value === m) planMsg.value = '' }, 5000) }
const planProject = computed(() => projects.value.find((p: any) => p.projectId === planProjectId.value) || null)
// Lokale Kopie der Vorgänge: Änderungen erscheinen sofort, der Server bestätigt oder ruft einen Fehler.
const planTasks = ref<any[]>([]), planRev = ref(0)
watch([planProject, view], () => { if (!planProjectId.value && projects.value.length) planProjectId.value = projects.value[0].projectId; planTasks.value = JSON.parse(JSON.stringify(planProject.value?.tasks || [])); planRev.value = planProject.value?.scheduleRev || 0 }, { immediate: true })
watch(projects, () => { if (!planProjectId.value && projects.value.length) planProjectId.value = projects.value[0].projectId }, { immediate: true })
const planPeople = computed(() => [...new Set([userEmail.value, ...(teamPeople.value), ...planTasks.value.map((t: any) => t.assignee).filter(Boolean)].filter(Boolean))])
const teamPeople = ref<string[]>([])
const userEmail = ref('')
onMounted(async () => { try { const u: any = await useAuthUser(); userEmail.value = u.email || '' } catch {} try { const r: any = await $fetch(useApiUrl('/api/team/members'), { headers: authHeaders }); teamPeople.value = (r.members || []).filter((m: any) => m.status === 'active').map((m: any) => m.memberEmail) } catch {} })

async function onPlanChange(changes: any[]) {
  const before = JSON.parse(JSON.stringify(planTasks.value))
  try {
    const applied = applyScheduleChanges(planTasks.value.map(toPlan), changes)            // sofortige Vorschau mit denselben Regeln wie der Server
    planTasks.value = planTasks.value.map(t => { const n = applied.find(a => a.taskId === t.taskId)!; return { ...t, ...n, title: t.title } })
  } catch (e: any) { say(e instanceof GanttError ? e.message : tr('Das geht so nicht.'), true); return }
  try {
    const r: any = await $fetch(useApiUrl(`/api/projects/${planProjectId.value}/schedule`), { method: 'PUT', headers: authHeaders, body: { changes, rev: planRev.value } })
    planTasks.value = r.tasks; planRev.value = r.rev
  } catch (e: any) { planTasks.value = before; say(e?.data?.message || tr('Speichern fehlgeschlagen.'), true); if (e?.statusCode === 409) await refresh() }
}
const toPlan = (t: any) => ({ taskId: t.taskId, title: t.title, startDate: isIsoDate(t.startDate) ? t.startDate : new Date().toISOString().slice(0, 10), endDate: isIsoDate(t.endDate) ? t.endDate : (isIsoDate(t.startDate) ? t.startDate : new Date().toISOString().slice(0, 10)), progress: t.progress ?? (t.status === 'done' ? 100 : 0), milestone: t.milestone === true, predecessors: t.predecessors || [], assignee: t.assignee || '', status: t.status })

const planModal = ref<null | { mode: 'create' | 'edit'; taskId?: string }>(null)
const pf = reactive<any>({ title: '', assignee: '', milestone: false, startDate: '', endDate: '', progress: 0, predecessors: [] as string[] })
const planSaving = ref(false), planErr = ref('')
const planOthers = computed(() => planTasks.value.filter((t: any) => t.taskId !== planModal.value?.taskId))
const todayIso = () => new Date().toISOString().slice(0, 10)
function openPlanCreate(milestone: boolean) { planErr.value = ''; Object.assign(pf, { title: '', assignee: '', milestone, startDate: todayIso(), endDate: ganttAddDays(todayIso(), 4), progress: 0, predecessors: [] }); planModal.value = { mode: 'create' } }
function openPlanEdit(taskId: string) {
  const t = planTasks.value.find((x: any) => x.taskId === taskId); if (!t) return
  planErr.value = ''; Object.assign(pf, { title: t.title, assignee: t.assignee || '', milestone: t.milestone === true, startDate: isIsoDate(t.startDate) ? t.startDate : todayIso(), endDate: isIsoDate(t.endDate) ? t.endDate : (t.startDate || todayIso()), progress: t.progress ?? (t.status === 'done' ? 100 : 0), predecessors: [...(t.predecessors || [])] })
  planModal.value = { mode: 'edit', taskId }
}
async function savePlanModal() {
  if (!planModal.value) return
  planSaving.value = true; planErr.value = ''
  try {
    if (planModal.value.mode === 'create') {
      await $fetch(useApiUrl(`/api/projects/${planProjectId.value}/tasks`), { method: 'POST', headers: authHeaders, body: { title: pf.title.trim(), assignee: pf.assignee, startDate: pf.startDate, endDate: pf.milestone ? pf.startDate : pf.endDate, milestone: pf.milestone, userId } })
      await refresh()
    } else {
      const id = planModal.value.taskId!, cur = planTasks.value.find((x: any) => x.taskId === id)
      if (cur && pf.title.trim() !== cur.title) await $fetch(useApiUrl(`/api/projects/${planProjectId.value}/tasks/${id}`), { method: 'PATCH', headers: authHeaders, body: { title: pf.title.trim(), userId } })
      const r: any = await $fetch(useApiUrl(`/api/projects/${planProjectId.value}/schedule`), { method: 'PUT', headers: authHeaders, body: { rev: planRev.value, changes: [{ taskId: id, startDate: pf.startDate, endDate: pf.milestone ? pf.startDate : pf.endDate, milestone: pf.milestone, progress: pf.progress, assignee: pf.assignee, predecessors: pf.predecessors }] } })
      planTasks.value = r.tasks.map((t: any) => (t.taskId === id ? { ...t, title: pf.title.trim() } : t)); planRev.value = r.rev
      await refresh()
    }
    planModal.value = null
  } catch (e: any) { planErr.value = e?.data?.message || e?.message || tr('Speichern fehlgeschlagen.') } finally { planSaving.value = false }
}
async function deletePlanTask() {
  if (!planModal.value?.taskId || !window.confirm(tr('Diesen Vorgang wirklich löschen?'))) return
  planSaving.value = true
  try { await $fetch(useApiUrl(`/api/projects/${planProjectId.value}/tasks/${planModal.value.taskId}`), { method: 'DELETE', headers: authHeaders }); planModal.value = null; await refresh() }
  catch (e: any) { planErr.value = e?.data?.message || tr('Löschen fehlgeschlagen.') } finally { planSaving.value = false }
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
    if (editing.value) await $fetch(useApiUrl(`/api/projects/${editing.value.projectId}`), { method:'PATCH', headers:authHeaders, body:{ ...form, userId } })
    else               await $fetch(useApiUrl('/api/projects'), { method:'POST', headers:authHeaders, body:{ ...form, userId } })
    await refresh(); showModal.value=false
  } finally { saving.value=false }
}
const { openConfirm } = useConfirm()

async function deleteProject(p: any) {
  if (!await openConfirm({ title: tr('Projekt löschen?'), name: p.name })) return
  await $fetch(useApiUrl(`/api/projects/${p.projectId}`), { method:'DELETE', headers:authHeaders })
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
      method:'POST', headers:authHeaders, body:{ ...newTask, userId }
    })
    await refresh(); showTaskModal.value=false
    expanded.value.add(taskProject.value.projectId)
    expanded.value = new Set(expanded.value)
  } finally { saving.value=false }
}

async function toggleTaskDone(p: any, tk: any) {
  await $fetch(useApiUrl(`/api/projects/${p.projectId}/tasks/${tk.taskId}`), {
    method:'PATCH', headers:authHeaders, body:{ status: tk.status==='done' ? 'todo' : 'done', userId }
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
    if (type==='subtask') await $fetch(useApiUrl(`/api/projects/${project.projectId}/tasks/${task.taskId}`), { method:'PATCH', headers:authHeaders, body:{ action:'add_subtask', text:inlineText.value, userId } })
    if (type==='comment') await $fetch(useApiUrl(`/api/projects/${project.projectId}/tasks/${task.taskId}`), { method:'PATCH', headers:authHeaders, body:{ action:'add_comment', text:inlineText.value, author:'Team', userId } })
    if (type==='time')    await $fetch(useApiUrl(`/api/projects/${project.projectId}/tasks/${task.taskId}`), { method:'PATCH', headers:authHeaders, body:{ action:'log_time', hours:inlineHours.value, userId } })
    await refresh()
    inlineModal.value=null
  } finally { saving.value=false }
}

async function toggleSubtask(p: any, tk: any, s: any) {
  await $fetch(useApiUrl(`/api/projects/${p.projectId}/tasks/${tk.taskId}`), {
    method:'PATCH', headers:authHeaders, body:{ action:'toggle_subtask', subtaskId:s.id, userId }
  })
  await refresh()
}

// ── EXPORT ────────────────────────────────────────────
const exportRows = () => projects.value.map((p: any) => ({ Projekt:p.name, Status:statusLabel(p.status), Priorität:priorityLabel(p.priority), Deadline:p.deadline?fmtDate(p.deadline):'', Fortschritt:`${p.progress||0}%`, Tasks:(p.tasks||[]).length }))
const exportCsv  = () => exportToCsv(`projekte-${new Date().toISOString().slice(0,10)}.csv`, exportRows())
const exportXlsx = () => exportToXlsx(`projekte-${new Date().toISOString().slice(0,10)}.xlsx`, exportRows(), 'Projekte')
</script>

<style scoped>
.plan-msg { padding: 8px 12px; border-radius: 8px; background: #00C85318; color: #00A844; font-size: 13px; margin-bottom: 8px } .plan-msg.err { background: #E05C5C18; color: #E05C5C }
.project-block { background: var(--bg-card); border: 0.5px solid var(--border); border-radius: 12px; margin-bottom: 8px; overflow: hidden; }
.project-block-header { padding: 12px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; }
.project-block-header:hover { background: rgba(255,255,255,0.02); }
.project-tasks { padding: 8px 16px 16px 40px; border-top: 0.5px solid var(--border); background: rgba(0,0,0,0.1); }
.task-card { background: var(--bg-elevated); border-radius: 8px; padding: 10px 12px; margin-bottom: 6px; }

/* GANTT */
.task-bar         { background: #6C3FE8 !important; opacity: 0.6 !important; top: 6px !important; bottom: 6px !important; }
</style>
