<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-ticket stat-icon"></i>
        <div class="stat-label">Tickets gesamt</div>
        <div class="stat-value">{{ tickets.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ openCount }} offen</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-alert-triangle stat-icon"></i>
        <div class="stat-label">Kritisch / Hoch</div>
        <div class="stat-value" style="color:#E05C5C">{{ criticalCount }}</div>
        <div class="stat-delta down"><i class="ti ti-arrow-down-right"></i> sofort handeln</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-loader stat-icon"></i>
        <div class="stat-label">In Bearbeitung</div>
        <div class="stat-value">{{ inProgressCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> aktiv</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-circle-check stat-icon"></i>
        <div class="stat-label">Gelöst</div>
        <div class="stat-value" style="color:#00D4B4">{{ resolvedCount }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> heute</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Support Tickets</span>
        <button class="accent-btn" style="height:28px;font-size:12px;padding:0 12px" @click="showAdd=true">
          <i class="ti ti-plus"></i> Neues Ticket
        </button>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Titel</th>
            <th>Kunde</th>
            <th>Priorität</th>
            <th>Status</th>
            <th>Erstellt</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!tickets.length">
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Keine Tickets</td>
          </tr>
          <tr v-for="t in tickets" :key="t.ticketId">
            <td class="td-name">{{ t.title }}</td>
            <td>{{ t.client }}</td>
            <td><span class="badge" :class="priorityBadge(t.priority)">{{ priorityLabel(t.priority) }}</span></td>
            <td><span class="badge" :class="t.status==='open'?'badge-danger':t.status==='in_progress'?'badge-warning':'badge-success'">{{ statusLabel(t.status) }}</span></td>
            <td style="font-size:11px;color:var(--text-muted)">{{ new Date(t.created).toLocaleDateString('de-DE') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showAdd" class="modal-overlay" @click.self="showAdd=false">
      <div class="modal-card">
        <div class="modal-header">
          <span class="card-title">Neues Ticket</span>
          <button class="icon-btn" @click="showAdd=false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <div class="auth-field"><label>Titel</label><input v-model="newTicket.title" placeholder="Problem beschreiben..." /></div>
          <div class="auth-field"><label>Kunde</label><input v-model="newTicket.client" placeholder="Firma GmbH" /></div>
          <div class="auth-field">
            <label>Priorität</label>
            <select v-model="newTicket.priority" style="background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px;font-size:14px;color:var(--text-primary);width:100%;outline:none">
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
              <option value="critical">Kritisch</option>
            </select>
          </div>
          <button class="auth-btn" :disabled="saving" @click="addTicket">
            <span v-if="saving"><i class="ti ti-loader-2 spin"></i></span>
            <span v-else>Ticket speichern</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { priorityLabel, priorityBadge, statusLabel } from '~/modules/support'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { userId } = await useAuthUser()

const { data, refresh } = await useFetch(() => useApiUrl(`/api/support?userId=${encodeURIComponent(userId)}`))
const tickets = computed(() => (data.value as any)?.tickets || [])

const openCount       = computed(() => tickets.value.filter((t: any) => t.status === 'open').length)
const inProgressCount = computed(() => tickets.value.filter((t: any) => t.status === 'in_progress').length)
const resolvedCount   = computed(() => tickets.value.filter((t: any) => t.status === 'resolved').length)
const criticalCount   = computed(() => tickets.value.filter((t: any) => t.priority === 'critical' || t.priority === 'high').length)

const route = useRoute()
const showAdd   = ref(false)
onMounted(() => { if (route.query.new) showAdd.value = true })
const saving    = ref(false)
const newTicket = reactive({ title: '', client: '', priority: 'medium' })

async function addTicket() {
  saving.value = true
  await $fetch(useApiUrl('/api/support'), { method: 'POST', body: { ...newTicket, userId: userId, status: 'open' } })
  await refresh()
  showAdd.value = false
  Object.assign(newTicket, { title: '', client: '', priority: 'medium' })
  saving.value = false
}
</script>
