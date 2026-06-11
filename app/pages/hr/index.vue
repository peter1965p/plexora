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
        <i class="ti ti-building stat-icon"></i>
        <div class="stat-label">Abteilungen</div>
        <div class="stat-value">{{ departments.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> aktiv</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-user-minus stat-icon"></i>
        <div class="stat-label">Offboarding</div>
        <div class="stat-value">{{ offboardingCount }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> in Bearbeitung</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Mitarbeiter</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
          <i class="ti ti-plus"></i> Neu
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Abteilung</th>
            <th>Rolle</th>
            <th>Start</th>
            <th>Status</th>
          </tr>
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
          <div class="auth-field"><label>E-Mail</label><input v-model="newEmp.email" placeholder="max@plexora.io" /></div>
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

  </div>
</template>

<script setup lang="ts">
import { statusLabel, statusBadge } from '~/modules/hr'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { data, refresh } = await useFetch('/api/hr')
const employees = computed(() => (data.value as any)?.employees || [])

const activeCount     = computed(() => employees.value.filter((e: any) => e.status === 'active').length)
const vacationCount   = computed(() => employees.value.filter((e: any) => e.status === 'vacation').length)
const offboardingCount = computed(() => employees.value.filter((e: any) => e.status === 'offboarding').length)
const departments     = computed(() => [...new Set(employees.value.map((e: any) => e.department))])

const showAdd = ref(false)
const saving  = ref(false)
const newEmp  = reactive({ firstName: '', lastName: '', email: '', department: '', role: '', startDate: '' })

async function addEmployee() {
  saving.value = true
  await $fetch('/api/hr', { method: 'POST', body: { ...newEmp, userId: 'demo-user', status: 'active' } })
  await refresh()
  showAdd.value = false
  Object.assign(newEmp, { firstName: '', lastName: '', email: '', department: '', role: '', startDate: '' })
  saving.value = false
}
</script>
