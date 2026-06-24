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
          <NuxtLink to="/crm" class="card-action">Alle ansehen</NuxtLink>
        </div>
        <div class="card-body" style="padding:16px 20px">
          <div class="activity-item" v-for="c in contacts" :key="c.contactId">
            <div class="activity-dot" :class="c.status === 'customer' ? 'cyan' : ''"></div>
            <div>
              <div class="activity-text">
                <NuxtLink :to="`/crm?edit=${c.contactId}`" style="color:var(--accent)">{{ c.firstName }} {{ c.lastName }}</NuxtLink>
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

  <!-- Admin: Demo Stats -->
  <div v-if="demoStats" class="card" style="margin-bottom:14px">
    <div class="card-header">
      <span class="card-title"><i class="ti ti-eye" style="color:var(--accent);margin-right:6px"></i>Demo-Nutzung</span>
      <span style="font-size:11px;color:var(--text-muted)">nur sichtbar für Admin</span>
    </div>
    <div class="stats-grid" style="padding:16px 20px">
      <div class="stat-card">
        <i class="ti ti-infinity stat-icon"></i>
        <div class="stat-label">Gesamt</div>
        <div class="stat-value">{{ demoStats.total.toLocaleString('de-DE') }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> API-Aufrufe</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-calendar-today stat-icon"></i>
        <div class="stat-label">Heute</div>
        <div class="stat-value">{{ demoStats.today }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> Aufrufe</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-calendar-month stat-icon"></i>
        <div class="stat-label">Diesen Monat</div>
        <div class="stat-value">{{ demoStats.month.toLocaleString('de-DE') }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> Aufrufe</div>
      </div>
      <div class="stat-card" style="grid-column:span 1">
        <i class="ti ti-chart-bar stat-icon"></i>
        <div class="stat-label">Letzte 7 Tage</div>
        <div style="display:flex;align-items:flex-end;gap:4px;height:36px;margin-top:4px">
          <div v-for="d in demoStats.last7" :key="d.date"
            :title="`${d.date}: ${d.count}`"
            :style="{
              flex: 1,
              background: 'var(--accent)',
              opacity: 0.5 + 0.5 * (d.count / (Math.max(...demoStats.last7.map((x:any)=>x.count)) || 1)),
              borderRadius: '3px 3px 0 0',
              height: demoStats.last7.some((x:any)=>x.count>0) ? `${Math.max(4, Math.round((d.count / Math.max(...demoStats.last7.map((x:any)=>x.count))) * 36))}px` : '4px',
            }">
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Kündigungsbutton §312k BGB -->
  <div v-if="isCustomer" style="margin-top:32px;padding-top:16px;border-top:0.5px solid var(--border);text-align:right">
    <button @click="cancelSubscription" style="background:transparent;border:0.5px solid var(--border);color:var(--text-muted);font-size:11px;padding:6px 12px;border-radius:6px;cursor:pointer;transition:all 0.15s" onmouseover="this.style.borderColor='#e05c5c';this.style.color='#e05c5c'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text-muted)'">
      Abonnement kündigen
    </button>
  </div>

  </div>
</template>

<script setup lang="ts">
import { calcWeightedPipeline, formatEur, stageLabel as dealStageLabel } from '~/modules/deals'
import { statusLabel, statusBadge, sortByMostUsed } from '~/modules/contacts'
import { priorityLabel, priorityBadge } from '~/modules/support'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const chartRef = ref<HTMLCanvasElement | null>(null)

const { userId, email, role } = await useAuthUser()
const isCustomer = role === 'customers'

async function cancelSubscription() {
  if (!confirm('Abonnement wirklich kündigen? Es läuft bis Ende des Abrechnungszeitraums weiter.')) return
  try {
    const res = await $fetch(useApiUrl('/api/licenses/portal'), { method: 'POST', body: { email } }) as any
    if (res.url) window.location.href = res.url
  } catch {
    alert('Kein aktives Abonnement gefunden.')
  }
}

const { data: dealsData }     = await useFetch(() => useApiUrl(`/api/deals?userId=${userId}`))
const { data: contactsData }  = await useFetch(() => useApiUrl(`/api/contacts?userId=${userId}`))
const { data: employeesData } = await useFetch(() => useApiUrl(`/api/hr?userId=${userId}`))
const { data: ticketsData }   = await useFetch(() => useApiUrl(`/api/support?userId=${userId}`))
const { data: invoicesData }  = await useFetch(() => useApiUrl(`/api/finance?userId=${userId}`))

const { data: demoStatsRaw } = await useFetch(
  () => useApiUrl(`/api/admin/demo-stats?email=${encodeURIComponent(email)}`),
  { default: () => null, onResponseError: () => {} }
)
const demoStats = computed(() => demoStatsRaw.value as any)

const deals     = computed(() => (dealsData.value as any)?.deals     || [])
const contacts  = computed(() => sortByMostUsed((contactsData.value as any)?.contacts || []).slice(0, 5))
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
