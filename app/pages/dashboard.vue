<template>
  <div class="page">

    <!-- STAT CARDS -->
    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-trending-up stat-icon"></i>
        <div class="stat-label">Pipeline Gewichtet</div>
        <div class="stat-value">{{ formatEur(weightedPipeline) }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ deals.length }} Deals aktiv</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-briefcase stat-icon"></i>
        <div class="stat-label">Aktive Deals</div>
        <div class="stat-value">{{ deals.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ wonDeals }} gewonnen</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-headset stat-icon"></i>
        <div class="stat-label">Offene Tickets</div>
        <div class="stat-value">{{ openTickets }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ tickets.length }} gesamt</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-users stat-icon"></i>
        <div class="stat-label">Mitarbeiter</div>
        <div class="stat-value">{{ employees.length }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ activeEmployees }} aktiv</div>
      </div>
    </div>

    <!-- CHART + ACTIVITY -->
    <div class="grid-3-1">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Finanzen — Übersicht</span>
          <span class="card-action">Export ↗</span>
        </div>
        <div class="card-body">
          <div class="chart-wrap">
            <canvas ref="chartRef"></canvas>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Kontakte</span>
          <span class="card-action">Alle ansehen</span>
        </div>
        <div class="card-body" style="padding:16px 20px">
          <div class="activity-item" v-for="c in contacts" :key="c.contactId">
            <div class="activity-dot" :class="c.status === 'customer' ? 'cyan' : ''"></div>
            <div>
              <div class="activity-text">
                <span style="color:var(--accent)">{{ c.firstName }} {{ c.lastName }}</span>
              </div>
              <div class="activity-time">{{ c.company }} · <span :class="statusBadge(c.status)">{{ statusLabel(c.status) }}</span></div>
            </div>
          </div>
          <div v-if="!contacts.length" style="color:var(--text-muted);font-size:13px">Keine Kontakte</div>
        </div>
      </div>
    </div>

    <!-- DEALS TABLE -->
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-title">Pipeline — Deals</span>
        <span class="card-action" @click="navigateTo('/crm')">Alle Deals ansehen</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Unternehmen</th>
            <th>Wert</th>
            <th>Phase</th>
            <th>Wahrscheinlichkeit</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!deals.length">
            <td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Keine Deals vorhanden</td>
          </tr>
          <tr v-for="d in deals" :key="d.dealId">
            <td class="td-name">{{ d.name }}</td>
            <td>{{ d.value }}</td>
            <td>{{ d.stage }}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1">
                  <div class="progress-bar">
                    <div class="progress-fill" :class="d.status === 'success' ? 'cyan' : ''" :style="{ width: d.prob + '%' }"></div>
                  </div>
                </div>
                <span style="font-size:11px;color:var(--text-muted);min-width:28px">{{ d.prob }}%</span>
              </div>
            </td>
            <td><span class="badge" :class="'badge-' + d.status">{{ dealStageLabel[d.status] }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- SUPPORT TICKETS -->
    <div class="card">
      <div class="card-header">
        <span class="card-title">Support — Offene Tickets</span>
        <span class="card-action" @click="navigateTo('/support')">Alle Tickets</span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th>Titel</th>
            <th>Kunde</th>
            <th>Priorität</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!tickets.length">
            <td colspan="4" style="text-align:center;color:var(--text-muted);padding:24px">Keine Tickets</td>
          </tr>
          <tr v-for="t in tickets" :key="t.ticketId">
            <td class="td-name">{{ t.title }}</td>
            <td>{{ t.client }}</td>
            <td><span class="badge" :class="priorityBadge(t.priority)">{{ priorityLabel(t.priority) }}</span></td>
            <td><span class="badge" :class="t.status === 'open' ? 'badge-danger' : 'badge-warning'">{{ ticketStatusLabel(t.status) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
import { calcWeightedPipeline, formatEur, stageLabel as dealStageLabel } from '~/modules/deals'
import { statusLabel, statusBadge } from '~/modules/contacts'
import { priorityLabel, priorityBadge } from '~/modules/support'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const chartRef = ref<HTMLCanvasElement | null>(null)

const { data: dealsData }     = await useFetch(useApiUrl('/api/deals')
const { data: contactsData }  = await useFetch(useApiUrl('/api/contacts')
const { data: employeesData } = await useFetch(useApiUrl('/api/hr')
const { data: ticketsData }   = await useFetch(useApiUrl('/api/support')
const { data: invoicesData }  = await useFetch(useApiUrl('/api/finance')

const deals     = computed(() => (dealsData.value as any)?.deals     || [])
const contacts  = computed(() => (contactsData.value as any)?.contacts  || [])
const employees = computed(() => (employeesData.value as any)?.employees || [])
const tickets   = computed(() => (ticketsData.value as any)?.tickets   || [])
const invoices  = computed(() => (invoicesData.value as any)?.invoices  || [])

const weightedPipeline = computed(() => calcWeightedPipeline(deals.value))
const wonDeals         = computed(() => deals.value.filter((d: any) => d.status === 'success').length)
const openTickets      = computed(() => tickets.value.filter((t: any) => t.status === 'open' || t.status === 'in_progress').length)
const activeEmployees  = computed(() => employees.value.filter((e: any) => e.status === 'active').length)

const ticketStatusLabel = (s: string) => ({ open: 'Offen', in_progress: 'In Arbeit', resolved: 'Gelöst', closed: 'Geschlossen' }[s] || s)

onMounted(async () => {
  if (!chartRef.value) return
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  const paid    = invoices.value.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + i.amount, 0)
  const pending = invoices.value.filter((i: any) => i.status === 'pending').reduce((s: number, i: any) => s + i.amount, 0)
  const overdue = invoices.value.filter((i: any) => i.status === 'overdue').reduce((s: number, i: any) => s + i.amount, 0)

  new Chart(chartRef.value, {
    type: 'doughnut',
    data: {
      labels: ['Bezahlt', 'Ausstehend', 'Überfällig'],
      datasets: [{
        data: [paid, pending, overdue],
        backgroundColor: ['#00D4B4', '#6C3FE8', '#E05C5C'],
        borderWidth: 0,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: '#8B8FA8', font: { size: 11 } } },
        tooltip: {
          backgroundColor: '#1C2338',
          callbacks: { label: (ctx) => ' € ' + ctx.parsed.toLocaleString('de-DE') }
        }
      }
    }
  })
})
</script>
