<template>
  <div class="page">

    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-receipt stat-icon"></i>
        <div class="stat-label">Gesamtumsatz</div>
        <div class="stat-value">{{ formatEur(totalRevenue) }}</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ paidCount }} bezahlt</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-users stat-icon"></i>
        <div class="stat-label">Lead → Kunde</div>
        <div class="stat-value">{{ conversionRate }}%</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ customerCount }} Kunden</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-target stat-icon"></i>
        <div class="stat-label">Deal Win Rate</div>
        <div class="stat-value">{{ winRate }}%</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ wonDeals }} gewonnen</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-headset stat-icon"></i>
        <div class="stat-label">Offene Tickets</div>
        <div class="stat-value">{{ openTickets }}</div>
        <div class="stat-delta" :class="openTickets > 5 ? 'down' : 'up'">
          <i class="ti" :class="openTickets > 5 ? 'ti-alert-triangle' : 'ti-check'"></i>
          {{ openTickets > 5 ? 'Handlungsbedarf' : 'Im Rahmen' }}
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:14px">

      <!-- UMSATZ NACH STATUS -->
      <div class="card">
        <div class="card-header"><span class="card-title">Rechnungen nach Status</span></div>
        <div class="card-body">
          <div class="chart-wrap"><canvas ref="invoiceChartRef"></canvas></div>
        </div>
      </div>

      <!-- DEALS PIPELINE -->
      <div class="card">
        <div class="card-header"><span class="card-title">Deal-Pipeline</span></div>
        <div class="card-body">
          <div class="chart-wrap"><canvas ref="dealChartRef"></canvas></div>
        </div>
      </div>

    </div>

    <div class="grid-2" style="margin-bottom:14px">

      <!-- KONTAKTE NACH STATUS -->
      <div class="card">
        <div class="card-header"><span class="card-title">Kontakte nach Status</span></div>
        <div class="card-body">
          <div class="chart-wrap"><canvas ref="contactChartRef"></canvas></div>
        </div>
      </div>

      <!-- PROJEKTE NACH STATUS -->
      <div class="card">
        <div class="card-header"><span class="card-title">Projekte nach Status</span></div>
        <div class="card-body">
          <div class="chart-wrap"><canvas ref="projectChartRef"></canvas></div>
        </div>
      </div>

    </div>

    <!-- KPI-TABELLE -->
    <div class="card">
      <div class="card-header"><span class="card-title">Modul-Übersicht</span></div>
      <table class="data-table">
        <thead>
          <tr><th>Modul</th><th>Gesamt</th><th>Aktiv / Offen</th><th>Abgeschlossen</th><th>Trend</th></tr>
        </thead>
        <tbody>
          <tr>
            <td class="td-name"><i class="ti ti-users" style="color:var(--accent)"></i> Kontakte</td>
            <td>{{ contacts.length }}</td>
            <td>{{ contacts.filter((c:any) => c.status === 'lead').length }} Leads</td>
            <td>{{ customerCount }} Kunden</td>
            <td><div class="progress-bar"><div class="progress-fill" :style="{width:conversionRate+'%'}"></div></div></td>
          </tr>
          <tr>
            <td class="td-name"><i class="ti ti-briefcase" style="color:var(--accent)"></i> Deals</td>
            <td>{{ deals.length }}</td>
            <td>{{ deals.filter((d:any) => d.status === 'info').length }} aktiv</td>
            <td>{{ wonDeals }} gewonnen</td>
            <td><div class="progress-bar"><div class="progress-fill cyan" :style="{width:winRate+'%'}"></div></div></td>
          </tr>
          <tr>
            <td class="td-name"><i class="ti ti-receipt" style="color:var(--accent)"></i> Finanzen</td>
            <td>{{ invoices.length }}</td>
            <td>{{ invoices.filter((i:any) => i.status === 'pending').length }} ausstehend</td>
            <td>{{ paidCount }} bezahlt</td>
            <td><div class="progress-bar"><div class="progress-fill cyan" :style="{width: invoices.length ? Math.round(paidCount/invoices.length*100)+'%' : '0%'}"></div></div></td>
          </tr>
          <tr>
            <td class="td-name"><i class="ti ti-layout-kanban" style="color:var(--accent)"></i> Projekte</td>
            <td>{{ projects.length }}</td>
            <td>{{ projects.filter((p:any) => p.status === 'active').length }} aktiv</td>
            <td>{{ projects.filter((p:any) => p.status === 'done').length }} fertig</td>
            <td><div class="progress-bar"><div class="progress-fill" :class="projects.filter((p:any)=>p.status==='overdue').length > 0 ? '' : 'cyan'" :style="{width: projects.length ? Math.round(projects.filter((p:any)=>p.status==='done').length/projects.length*100)+'%' : '0%'}"></div></div></td>
          </tr>
          <tr>
            <td class="td-name"><i class="ti ti-headset" style="color:var(--accent)"></i> Support</td>
            <td>{{ tickets.length }}</td>
            <td>{{ openTickets }} offen</td>
            <td>{{ tickets.filter((t:any) => t.status === 'resolved' || t.status === 'closed').length }} gelöst</td>
            <td><div class="progress-bar"><div class="progress-fill cyan" :style="{width: tickets.length ? Math.round(tickets.filter((t:any)=>t.status==='resolved'||t.status==='closed').length/tickets.length*100)+'%' : '0%'}"></div></div></td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { userId, idToken } = await useAuthUser()
const authHeaders = { Authorization: `Bearer ${idToken}` }

const invoiceChartRef = ref<HTMLCanvasElement | null>(null)
const dealChartRef    = ref<HTMLCanvasElement | null>(null)
const contactChartRef = ref<HTMLCanvasElement | null>(null)
const projectChartRef = ref<HTMLCanvasElement | null>(null)

const { data: invoicesData } = await useFetch(() => useApiUrl(`/api/finance?userId=${encodeURIComponent(userId)}`),  { getCachedData: () => undefined, headers: authHeaders })
const { data: dealsData }    = await useFetch(() => useApiUrl(`/api/deals?userId=${encodeURIComponent(userId)}`),    { getCachedData: () => undefined, headers: authHeaders })
const { data: contactsData } = await useFetch(() => useApiUrl(`/api/contacts?userId=${encodeURIComponent(userId)}`), { getCachedData: () => undefined, headers: authHeaders })
const { data: ticketsData }  = await useFetch(() => useApiUrl(`/api/support?userId=${encodeURIComponent(userId)}`),  { getCachedData: () => undefined, headers: authHeaders })
const { data: projectsData } = await useFetch(() => useApiUrl(`/api/projects?userId=${encodeURIComponent(userId)}`), { getCachedData: () => undefined, headers: authHeaders })

const invoices = computed(() => (invoicesData.value as any)?.invoices || [])
const deals    = computed(() => (dealsData.value as any)?.deals       || [])
const contacts = computed(() => (contactsData.value as any)?.contacts  || [])
const tickets  = computed(() => (ticketsData.value as any)?.tickets    || [])
const projects = computed(() => (projectsData.value as any)?.projects  || [])

// KPIs
const totalRevenue   = computed(() => invoices.value.filter((i:any) => i.status === 'paid').reduce((s:number, i:any) => s + (i.amount || 0), 0))
const paidCount      = computed(() => invoices.value.filter((i:any) => i.status === 'paid').length)
const customerCount  = computed(() => contacts.value.filter((c:any) => c.status === 'customer').length)
const leadCount      = computed(() => contacts.value.filter((c:any) => c.status === 'lead').length)
const conversionRate = computed(() => contacts.value.length ? Math.round(customerCount.value / contacts.value.length * 100) : 0)
const wonDeals       = computed(() => deals.value.filter((d:any) => d.status === 'success').length)
const winRate        = computed(() => deals.value.length ? Math.round(wonDeals.value / deals.value.length * 100) : 0)
const openTickets    = computed(() => tickets.value.filter((t:any) => t.status === 'open' || t.status === 'in_progress').length)

function formatEur(val: number): string {
  return '€ ' + val.toLocaleString('de-DE', { maximumFractionDigits: 0 })
}

onMounted(async () => {
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  const COLORS = ['#00D4B4', '#6C3FE8', '#E05C5C', '#F0B428', '#3F8FE8']
  const chartDefaults = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true, position: 'bottom' as const, labels: { color: '#8B8FA8', font: { size: 11 } } } }
  }

  // Rechnungen nach Status
  if (invoiceChartRef.value) {
    const paid    = invoices.value.filter((i:any) => i.status === 'paid').length
    const pending = invoices.value.filter((i:any) => i.status === 'pending').length
    const overdue = invoices.value.filter((i:any) => i.status === 'overdue').length
    new Chart(invoiceChartRef.value, {
      type: 'doughnut',
      data: { labels: ['Bezahlt', 'Ausstehend', 'Überfällig'], datasets: [{ data: [paid, pending, overdue], backgroundColor: ['#00D4B4','#6C3FE8','#E05C5C'], borderWidth: 0 }] },
      options: chartDefaults
    })
  }

  // Deals nach Status
  if (dealChartRef.value) {
    const won  = deals.value.filter((d:any) => d.status === 'success').length
    const work = deals.value.filter((d:any) => d.status === 'info').length
    const neg  = deals.value.filter((d:any) => d.status === 'warning').length
    const lost = deals.value.filter((d:any) => d.status === 'danger').length
    new Chart(dealChartRef.value, {
      type: 'bar',
      data: { labels: ['Gewonnen','In Arbeit','Verhandlung','Verloren'], datasets: [{ data: [won, work, neg, lost], backgroundColor: ['#00D4B4','#6C3FE8','#F0B428','#E05C5C'], borderRadius: 6, borderWidth: 0 }] },
      options: { ...chartDefaults, plugins: { legend: { display: false } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#545870' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#545870', stepSize: 1 } } } }
    })
  }

  // Kontakte nach Status
  if (contactChartRef.value) {
    const leads    = leadCount.value
    const customers = customerCount.value
    const churned  = contacts.value.filter((c:any) => c.status === 'churned').length
    new Chart(contactChartRef.value, {
      type: 'doughnut',
      data: { labels: ['Leads','Kunden','Verloren'], datasets: [{ data: [leads, customers, churned], backgroundColor: ['#6C3FE8','#00D4B4','#E05C5C'], borderWidth: 0 }] },
      options: chartDefaults
    })
  }

  // Projekte nach Status
  if (projectChartRef.value) {
    const active  = projects.value.filter((p:any) => p.status === 'active').length
    const review  = projects.value.filter((p:any) => p.status === 'review').length
    const done    = projects.value.filter((p:any) => p.status === 'done').length
    const overdue = projects.value.filter((p:any) => p.status === 'overdue').length
    new Chart(projectChartRef.value, {
      type: 'doughnut',
      data: { labels: ['Aktiv','Review','Fertig','Verzug'], datasets: [{ data: [active, review, done, overdue], backgroundColor: ['#6C3FE8','#F0B428','#00D4B4','#E05C5C'], borderWidth: 0 }] },
      options: chartDefaults
    })
  }
})
</script>
