<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-users stat-icon"></i>
        <div class="stat-label">{{ t.hr.totalEmployees }}</div>
        <div class="stat-value">{{ employees.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ activeCount }} {{ t.hr.active }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-beach stat-icon"></i>
        <div class="stat-label">{{ t.hr.onLeave }}</div>
        <div class="stat-value">{{ vacationCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ t.hr.current }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-speakerphone stat-icon"></i>
        <div class="stat-label">{{ t.hr.activeCampaigns }}</div>
        <div class="stat-value">{{ activeCampaigns }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ totalApplications }} {{ t.hr.applications }}</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-user-minus stat-icon"></i>
        <div class="stat-label">{{ t.hr.offboarding }}</div>
        <div class="stat-value">{{ offboardingCount }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> {{ t.hr.inProgress }}</div>
      </div>
    </div>

    <!-- TABS -->
    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button class="theme-opt" :class="{ active: tab === 'employees' }"   @click="tab='employees'">   <i class="ti ti-users"></i> {{ t.hr.tabEmployees }}</button>
      <button class="theme-opt" :class="{ active: tab === 'recruiting' }"  @click="tab='recruiting'">  <i class="ti ti-speakerphone"></i> {{ t.hr.tabRecruiting }}</button>
      <button class="theme-opt" :class="{ active: tab === 'leave' }"       @click="tab='leave'">       <i class="ti ti-beach"></i> {{ t.hr.tabLeave }}</button>
      <button class="theme-opt" :class="{ active: tab === 'timelog' }"     @click="tab='timelog'">     <i class="ti ti-clock"></i> {{ t.hr.tabTimelog }}</button>
      <button class="theme-opt" :class="{ active: tab === 'onboarding' }"  @click="tab='onboarding'">  <i class="ti ti-list-check"></i> {{ t.hr.tabOnboarding }}</button>
    </div>

    <!-- MITARBEITER TAB -->
    <div v-if="tab === 'employees'" class="card">
      <div class="card-header">
        <span class="card-title">{{ t.hr.tabEmployees }}</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
          <i class="ti ti-plus"></i> {{ t.common.new }}
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>{{ t.common.name }}</th><th>{{ t.hr.department }}</th><th>{{ t.hr.role }}</th><th>{{ t.hr.start }}</th><th>{{ t.common.status }}</th></tr>
        </thead>
        <tbody>
          <tr v-if="!employees.length">
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.hr.noEmployees }}</td>
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
          <span class="card-title">{{ t.hr.campaigns }}</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showCampaign=true">
            <i class="ti ti-plus"></i> {{ t.hr.newCampaign }}
          </button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>{{ t.hr.position }}</th><th>{{ t.hr.department }}</th><th>{{ t.hr.location }}</th><th>{{ t.hr.employmentType }}</th><th>{{ t.hr.link }}</th><th style="width:60px">{{ t.hr.applicants }}</th></tr>
          </thead>
          <tbody>
            <tr v-if="!campaigns.length">
              <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.hr.noCampaigns }}</td>
            </tr>
            <tr v-for="c in campaigns" :key="c.campaignId">
              <td class="td-name">{{ c.title }}</td>
              <td>{{ c.department }}</td>
              <td style="font-size:12px">{{ c.location }}</td>
              <td><span class="badge badge-info">{{ typeLabel[c.type] || c.type }}</span></td>
              <td>
                <button class="icon-btn" :title="t.hr.copyLink" @click="copyLink(c.campaignId)">
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
          <span class="card-title">{{ t.hr.applicationsFor.replace('{title}', selectedCampaign.title) }}</span>
          <button class="icon-btn" @click="selectedCampaign=null"><i class="ti ti-x"></i></button>
        </div>
        <table class="data-table">
          <thead>
            <tr><th>{{ t.common.name }}</th><th>{{ t.common.email }}</th><th>{{ t.common.phone }}</th><th>{{ t.common.date }}</th><th>{{ t.common.status }}</th></tr>
          </thead>
          <tbody>
            <tr v-if="!selectedApplications.length">
              <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.hr.noApplications }}</td>
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
          <span class="card-title">{{ t.hr.newEmployee }}</span>
          <button class="icon-btn" @click="showAdd=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.crm.firstName }}</label><input v-model="newEmp.firstName" placeholder="Max" /></div>
            <div class="auth-field"><label>{{ t.crm.lastName }}</label><input v-model="newEmp.lastName" placeholder="Mustermann" /></div>
          </div>
          <div class="auth-field"><label>{{ t.common.email }}</label><input v-model="newEmp.email" placeholder="max@firma.de" /></div>
          <div class="auth-field"><label>{{ t.hr.department }}</label><input v-model="newEmp.department" placeholder="Engineering" /></div>
          <div class="auth-field"><label>{{ t.hr.role }}</label><input v-model="newEmp.role" placeholder="Developer" /></div>
          <div class="auth-field"><label>{{ t.hr.startDate }}</label><input v-model="newEmp.startDate" type="date" /></div>
          <button class="auth-btn" :disabled="saving" @click="addEmployee">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ t.hr.saveEmployee }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- KAMPAGNE MODAL -->
    <div v-if="toast" class="toast-success">
      <i class="ti ti-circle-check"></i> {{ toast }}
    </div>

    <div v-if="showCampaign" class="modal-overlay" @click.self="showCampaign=false">
      <div class="modal-card" style="max-width:600px;max-height:90vh;overflow-y:auto">
        <div class="modal-header">
          <span class="card-title">{{ t.hr.newCampaignTitle }}</span>
          <button class="icon-btn" @click="showCampaign=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>{{ t.hr.jobTitle }}</label><input v-model="newCamp.title" placeholder="Senior Developer" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.hr.department }}</label><input v-model="newCamp.department" placeholder="Engineering" /></div>
            <div class="auth-field"><label>{{ t.hr.location }}</label><input v-model="newCamp.location" placeholder="Remote / Berlin" /></div>
          </div>
          <div class="auth-field">
            <label>{{ t.hr.employmentType }}</label>
            <select v-model="newCamp.type" class="form-select">
              <option value="fulltime">{{ t.hr.fullTime }}</option>
              <option value="parttime">{{ t.hr.partTime }}</option>
              <option value="internship">{{ t.hr.internship }}</option>
              <option value="freelance">{{ t.hr.freelance }}</option>
            </select>
          </div>
          <div class="auth-field">
            <label>{{ t.hr.jobDescription }}</label>
            <textarea v-model="newCamp.description" placeholder="Beschreibung der Stelle..." rows="4"
              style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
          </div>
          <div class="auth-field">
            <label>{{ t.hr.requirements }}</label>
            <textarea v-model="newCamp.requirements" placeholder="Was erwarten wir?" rows="3"
              style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none;resize:vertical;font-family:inherit"></textarea>
          </div>
          <div style="border-top:0.5px solid var(--border);margin:16px 0;padding-top:16px">
            <div class="settings-label" style="margin-bottom:12px">🎨 Kampagnen-Design</div>
            <div class="auth-field"><label>Firmenname (auf Bewerbungsseite)</label><input v-model="newCamp.companyName" placeholder="Päffgen IT GmbH" /></div>
            <div class="auth-row">
              <div class="auth-field">
                <label>Akzentfarbe</label>
                <div style="display:flex;gap:8px;align-items:center">
                  <input type="color" v-model="newCamp.accentColor" style="width:48px;height:36px;border-radius:6px;border:0.5px solid var(--border);background:none;cursor:pointer;padding:2px" />
                  <span style="font-size:12px;color:var(--text-muted)">{{ newCamp.accentColor }}</span>
                </div>
              </div>
              <div class="auth-field"><label>Logo-URL</label><input v-model="newCamp.logoUrl" placeholder="https://..." /></div>
            </div>
            <div class="auth-field"><label>Header-Bild URL (optional)</label><input v-model="newCamp.headerImageUrl" placeholder="https://..." /></div>
          </div>
          <button class="auth-btn" :disabled="saving" @click="addCampaign">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else><i class="ti ti-speakerphone"></i> {{ t.hr.createCampaign }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ TAB: URLAUB ═══ -->
    <div v-if="tab === 'leave'">
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">{{ t.hr.leaveRequests }}</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showLeave=true">
            <i class="ti ti-plus"></i> {{ t.hr.requestLeave }}
          </button>
        </div>
        <table class="data-table">
          <thead><tr><th>{{ t.hr.employee }}</th><th>{{ t.common.type }}</th><th>{{ t.common.from }}</th><th>{{ t.common.to }}</th><th>{{ t.hr.reason }}</th><th>{{ t.common.status }}</th><th style="width:80px"></th></tr></thead>
          <tbody>
            <tr v-if="!leaveRequests.length"><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.hr.noRequests }}</td></tr>
            <tr v-for="r in leaveRequests" :key="r.leaveId">
              <td class="td-name">{{ r.employeeName }}</td>
              <td><span class="badge badge-info">{{ leaveTypeLabel[r.type] || r.type }}</span></td>
              <td style="font-size:12px">{{ r.startDate }}</td>
              <td style="font-size:12px">{{ r.endDate }}</td>
              <td style="font-size:12px;color:var(--text-muted)">{{ r.reason || '–' }}</td>
              <td>
                <span class="badge" :class="r.status==='approved'?'badge-success':r.status==='rejected'?'badge-danger':'badge-warning'">
                  {{ r.status==='approved' ? t.hr.approved : r.status==='rejected' ? t.hr.rejected : t.hr.pending }}
                </span>
              </td>
              <td>
                <div v-if="r.status==='pending'" style="display:flex;gap:4px">
                  <button class="icon-btn" style="color:#00D4B4" :title="t.hr.approve" @click="approveLeave(r)"><i class="ti ti-check"></i></button>
                  <button class="icon-btn" style="color:#E05C5C" :title="t.hr.reject"  @click="rejectLeave(r)"><i class="ti ti-x"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ TAB: ZEITERFASSUNG ═══ -->
    <div v-if="tab === 'timelog'">
      <div class="card" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(99,102,241,0.08),rgba(167,139,250,0.06));border-color:rgba(99,102,241,0.25)">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px">
          <div>
            <div style="font-weight:700;font-size:15px;margin-bottom:4px">{{ t.hr.timeclock }}</div>
            <div style="font-size:12px;color:var(--text-muted)">Kiosk-Modus für Mitarbeiter — auf großem Display oder Tablet öffnen</div>
          </div>
          <NuxtLink to="/stempel" target="_blank" class="accent-btn" style="display:flex;align-items:center;gap:8px;text-decoration:none">
            <i class="ti ti-clock-play"></i> {{ t.hr.openTimeclock }}
          </NuxtLink>
        </div>
      </div>
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">{{ t.hr.recordTime }}</span>
          <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showTimelog=true">
            <i class="ti ti-plus"></i> {{ t.hr.entry }}
          </button>
        </div>
        <table class="data-table">
          <thead><tr><th>{{ t.hr.employee }}</th><th>{{ t.common.date }}</th><th>{{ t.common.from }}</th><th>{{ t.common.to }}</th><th>Stunden</th><th>{{ t.hr.note }}</th></tr></thead>
          <tbody>
            <tr v-if="!timelogEntries.length"><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">{{ t.hr.noEntries }}</td></tr>
            <tr v-for="e in timelogEntries" :key="e.logId">
              <td class="td-name">{{ e.employeeName }}</td>
              <td style="font-size:12px">{{ e.date }}</td>
              <td style="font-size:12px">{{ e.clockIn || '–' }}</td>
              <td style="font-size:12px">{{ e.clockOut || '–' }}</td>
              <td style="font-weight:600;color:#00D4B4">{{ (e.minutes / 60).toFixed(2) }}h</td>
              <td style="font-size:12px;color:var(--text-muted)">{{ e.note || '–' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ═══ TAB: ONBOARDING ═══ -->
    <div v-if="tab === 'onboarding'">
      <div class="card">
        <div class="card-header">
          <span class="card-title">{{ t.hr.onboarding }}</span>
          <select v-model="onboardingEmpId" class="form-select" style="height:28px;font-size:12px;padding:0 8px;max-width:200px">
            <option value="">{{ t.hr.selectEmployee2 }}</option>
            <option v-for="e in employees" :key="e.employeeId" :value="e.employeeId">{{ e.firstName }} {{ e.lastName }}</option>
          </select>
        </div>
        <div v-if="onboardingEmpId">
          <div style="padding:12px 20px">
            <div style="display:flex;gap:8px;margin-bottom:12px">
              <input v-model="newCheckItem" :placeholder="t.hr.addTask" style="flex:1;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text-primary);outline:none" @keyup.enter="addCheckItem" />
              <button class="accent-btn" style="height:36px;padding:0 14px" @click="addCheckItem"><i class="ti ti-plus"></i></button>
            </div>
            <div v-if="!currentChecklist.length" style="color:var(--text-muted);font-size:13px;text-align:center;padding:16px">{{ t.hr.noTasks }}</div>
            <div v-for="item in currentChecklist" :key="item.id" style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid var(--border)">
              <input type="checkbox" :checked="item.done" @change="toggleCheck(item)" style="accent-color:var(--accent);width:16px;height:16px;flex-shrink:0" />
              <span :style="item.done?'text-decoration:line-through;color:var(--text-muted)':''" style="flex:1;font-size:13px">{{ item.text }}</span>
              <span style="font-size:11px;color:var(--text-muted)">{{ item.done ? '✓' : '' }}</span>
            </div>
            <div v-if="currentChecklist.length" style="margin-top:12px">
              <div class="progress-bar"><div class="progress-fill cyan" :style="{ width: checkProgress + '%' }"></div></div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:4px;text-align:right">{{ doneCheckCount }}/{{ currentChecklist.length }} {{ t.hr.done }} ({{ checkProgress }}%)</div>
            </div>
          </div>
        </div>
        <div v-else style="text-align:center;color:var(--text-muted);padding:32px;font-size:13px">{{ t.hr.selectEmployeeHint }}</div>
      </div>
    </div>

    <!-- URLAUB MODAL -->
    <div v-if="showLeave" class="modal-overlay" @click.self="showLeave=false">
      <div class="modal-card">
        <div class="modal-header"><span class="card-title">{{ t.hr.leaveModal }}</span><button class="icon-btn" @click="showLeave=false"><i class="ti ti-x"></i></button></div>
        <div class="modal-body">
          <div class="auth-field">
            <label>{{ t.hr.employee }}</label>
            <select v-model="newLeave.employeeId" class="form-select" @change="setLeaveName">
              <option value="">{{ t.hr.selectEmployee }}</option>
              <option v-for="e in employees" :key="e.employeeId" :value="e.employeeId">{{ e.firstName }} {{ e.lastName }}</option>
            </select>
          </div>
          <div class="auth-field">
            <label>{{ t.common.type }}</label>
            <select v-model="newLeave.type" class="form-select">
              <option value="vacation">{{ t.hr.vacation }}</option>
              <option value="sick">{{ t.hr.sick }}</option>
              <option value="remote">{{ t.hr.homeOffice }}</option>
              <option value="other">{{ t.common.other }}</option>
            </select>
          </div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.common.from }}</label><input v-model="newLeave.startDate" type="date" /></div>
            <div class="auth-field"><label>{{ t.common.to }}</label><input v-model="newLeave.endDate" type="date" /></div>
          </div>
          <div class="auth-field"><label>{{ t.hr.reason }} (optional)</label><input v-model="newLeave.reason" placeholder="..." /></div>
          <button class="auth-btn" :disabled="saving||!newLeave.employeeId" @click="submitLeave">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ t.hr.submitRequest }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- TIMELOG MODAL -->
    <div v-if="showTimelog" class="modal-overlay" @click.self="showTimelog=false">
      <div class="modal-card">
        <div class="modal-header"><span class="card-title">{{ t.hr.recordTimeModal }}</span><button class="icon-btn" @click="showTimelog=false"><i class="ti ti-x"></i></button></div>
        <div class="modal-body">
          <div class="auth-field">
            <label>{{ t.hr.employee }}</label>
            <select v-model="newTimelog.employeeId" class="form-select" @change="setTimelogName">
              <option value="">{{ t.hr.selectEmployee }}</option>
              <option v-for="e in employees" :key="e.employeeId" :value="e.employeeId">{{ e.firstName }} {{ e.lastName }}</option>
            </select>
          </div>
          <div class="auth-field"><label>{{ t.common.date }}</label><input v-model="newTimelog.date" type="date" /></div>
          <div class="auth-row">
            <div class="auth-field"><label>{{ t.hr.fromTime }}</label><input v-model="newTimelog.clockIn" type="time" /></div>
            <div class="auth-field"><label>{{ t.hr.toTime }}</label><input v-model="newTimelog.clockOut" type="time" /></div>
          </div>
          <div class="auth-field"><label>{{ t.hr.note }}</label><input v-model="newTimelog.note" placeholder="z.B. Kundenprojekt" /></div>
          <button class="auth-btn" :disabled="saving||!newTimelog.employeeId" @click="submitTimelog">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>{{ t.common.save }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- TOAST -->
  </div>
</template>

<script setup lang="ts">
import { statusLabel, statusBadge } from '~/modules/hr'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { userId, idToken } = await useAuthUser()
const authHeaders = { Authorization: `Bearer ${idToken}` }
const { t, lang } = useLang()

const tab = ref('employees')

// ── Mitarbeiter ───────────────────────────────────────
const { data, refresh } = await useFetch(() => useApiUrl(`/api/hr?userId=${encodeURIComponent(userId)}`), { headers: authHeaders })
const employees = computed(() => (data.value as any)?.employees || [])

const activeCount      = computed(() => employees.value.filter((e: any) => e.status === 'active').length)
const vacationCount    = computed(() => employees.value.filter((e: any) => e.status === 'vacation').length)
const offboardingCount = computed(() => employees.value.filter((e: any) => e.status === 'offboarding').length)

const route = useRoute()
const showAdd = ref(false)
const saving  = ref(false)
onMounted(() => { if (route.query.new) showAdd.value = true })
const newEmp  = reactive({ firstName: '', lastName: '', email: '', department: '', role: '', startDate: '' })

async function addEmployee() {
  saving.value = true
  await $fetch(useApiUrl('/api/hr'), { method: 'POST', headers: authHeaders, body: { ...newEmp, userId: userId, status: 'active' } })
  await refresh()
  showAdd.value = false
  Object.assign(newEmp, { firstName: '', lastName: '', email: '', department: '', role: '', startDate: '' })
  saving.value = false
}

// ── Recruiting ────────────────────────────────────────
const { data: campData, refresh: refreshCamps } = await useFetch(() => useApiUrl(`/api/hr/campaigns?userId=${encodeURIComponent(userId)}`), { headers: authHeaders })
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

const newCamp = reactive({ title: '', department: '', location: '', type: 'fulltime', description: '', requirements: '', companyName: '', accentColor: '#6C3FE8', logoUrl: '', headerImageUrl: '' })

function applicationCount(campaignId: string) {
  return allApplications.value.filter((a: any) => a.campaignId === campaignId).length
}

async function viewApplications(campaign: any) {
  selectedCampaign.value = campaign
  const data = await $fetch(useApiUrl(`/api/hr/campaigns/${campaign.campaignId}/applications`), { headers: authHeaders }) as any
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
    await $fetch(useApiUrl('/api/hr/campaigns'), { method: 'POST', headers: authHeaders, body: { ...newCamp, userId: userId } })
    await refreshCamps()
    showCampaign.value = false
    Object.assign(newCamp, { title: '', department: '', location: '', type: 'fulltime', description: '', requirements: '' })
    showToast('Kampagne erstellt!')
  } finally {
    saving.value = false
  }
}

// ── Urlaub ────────────────────────────────────────────
const { data: leaveData, refresh: refreshLeave } = await useFetch(() => useApiUrl(`/api/hr/leave?userId=${encodeURIComponent(userId)}`), { headers: authHeaders })
const leaveRequests = computed(() => (leaveData.value as any)?.requests || [])
const leaveTypeLabel: Record<string,string> = { vacation:'Urlaub', sick:'Krank', remote:'Home Office', other:'Sonstiges' }
const showLeave = ref(false)
const newLeave = reactive({ employeeId:'', employeeName:'', type:'vacation', startDate:'', endDate:'', reason:'' })

function setLeaveName() {
  const e = employees.value.find((x: any) => x.employeeId === newLeave.employeeId)
  newLeave.employeeName = e ? `${e.firstName} ${e.lastName}` : ''
}
async function submitLeave() {
  saving.value = true
  try {
    await $fetch(useApiUrl('/api/hr/leave'), { method:'POST', headers:authHeaders, body:{ ...newLeave, userId } })
    await refreshLeave(); showLeave.value=false
    Object.assign(newLeave, { employeeId:'', employeeName:'', type:'vacation', startDate:'', endDate:'', reason:'' })
    showToast('Antrag eingereicht!')
  } finally { saving.value=false }
}
async function approveLeave(r: any) {
  await $fetch(useApiUrl(`/api/hr/leave/${r.leaveId}/approve`), { method:'POST', headers:authHeaders, body:{ userId } })
  await refreshLeave(); showToast('Genehmigt!')
}
async function rejectLeave(r: any) {
  await $fetch(useApiUrl(`/api/hr/leave/${r.leaveId}/reject`), { method:'POST', headers:authHeaders, body:{ userId } })
  await refreshLeave(); showToast('Abgelehnt!')
}

// ── Zeiterfassung ─────────────────────────────────────
const { data: timelogData, refresh: refreshTimelog } = await useFetch(() => useApiUrl(`/api/hr/timelog?userId=${encodeURIComponent(userId)}`), { headers: authHeaders })
const timelogEntries = computed(() => (timelogData.value as any)?.entries || [])
const showTimelog  = ref(false)
const newTimelog   = reactive({ employeeId:'', employeeName:'', date: new Date().toISOString().slice(0,10), clockIn:'', clockOut:'', note:'' })

function setTimelogName() {
  const e = employees.value.find((x: any) => x.employeeId === newTimelog.employeeId)
  newTimelog.employeeName = e ? `${e.firstName} ${e.lastName}` : ''
}
async function submitTimelog() {
  saving.value = true
  try {
    await $fetch(useApiUrl('/api/hr/timelog'), { method:'POST', headers:authHeaders, body:{ ...newTimelog, userId } })
    await refreshTimelog(); showTimelog.value=false
    Object.assign(newTimelog, { employeeId:'', employeeName:'', date: new Date().toISOString().slice(0,10), clockIn:'', clockOut:'', note:'' })
    showToast('Zeit erfasst!')
  } finally { saving.value=false }
}

// ── Onboarding ────────────────────────────────────────
const onboardingEmpId  = ref('')
const onboardingLists  = ref<Record<string, any[]>>({})
const newCheckItem     = ref('')

const currentChecklist = computed(() => onboardingLists.value[onboardingEmpId.value] || [])
const doneCheckCount   = computed(() => currentChecklist.value.filter((i: any) => i.done).length)
const checkProgress    = computed(() => currentChecklist.value.length ? Math.round(doneCheckCount.value / currentChecklist.value.length * 100) : 0)

function addCheckItem() {
  if (!newCheckItem.value.trim() || !onboardingEmpId.value) return
  const list = onboardingLists.value[onboardingEmpId.value] || []
  onboardingLists.value[onboardingEmpId.value] = [...list, { id: Date.now().toString(), text: newCheckItem.value, done: false }]
  newCheckItem.value = ''
}
function toggleCheck(item: any) {
  item.done = !item.done
}
</script>
