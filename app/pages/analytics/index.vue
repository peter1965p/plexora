<template>
  <div class="page">
    <div class="stats-grid">
      <div class="stat-card">
        <i class="ti ti-eye stat-icon"></i>
        <div class="stat-label">Seitenaufrufe</div>
        <div class="stat-value">12.847</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> +18% vs. Vormonat</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-users stat-icon"></i>
        <div class="stat-label">Aktive Nutzer</div>
        <div class="stat-value">1.243</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> +7% vs. Vormonat</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-clock stat-icon"></i>
        <div class="stat-label">Ø Sitzungsdauer</div>
        <div class="stat-value">4:32</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> +12% vs. Vormonat</div>
      </div>
      <div class="stat-card">
        <i class="ti ti-bounce-right stat-icon"></i>
        <div class="stat-label">Absprungrate</div>
        <div class="stat-value">24%</div>
        <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> -3% vs. Vormonat</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom:14px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Nutzer — letzten 7 Tage</span>
        </div>
        <div class="card-body">
          <div class="chart-wrap">
            <canvas ref="lineRef"></canvas>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">Traffic Quellen</span>
        </div>
        <div class="card-body">
          <div class="chart-wrap">
            <canvas ref="doughnutRef"></canvas>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Top Seiten</span>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Seite</th><th>Aufrufe</th><th>Nutzer</th><th>Absprungrate</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in pages" :key="p.path">
            <td class="td-name">{{ p.path }}</td>
            <td>{{ p.views.toLocaleString('de-DE') }}</td>
            <td>{{ p.users.toLocaleString('de-DE') }}</td>
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="flex:1"><div class="progress-bar"><div class="progress-fill" :style="{width:p.bounce+'%'}"></div></div></div>
                <span style="font-size:11px;color:var(--text-muted)">{{ p.bounce }}%</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const lineRef     = ref<HTMLCanvasElement | null>(null)
const doughnutRef = ref<HTMLCanvasElement | null>(null)

const pages = [
  { path: '/dashboard', views: 4821, users: 1102, bounce: 18 },
  { path: '/crm',       views: 3204, users:  876, bounce: 22 },
  { path: '/finance',   views: 2108, users:  654, bounce: 31 },
  { path: '/hr',        views: 1543, users:  421, bounce: 28 },
  { path: '/support',   views: 1171, users:  389, bounce: 35 },
]

onMounted(async () => {
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)

  if (lineRef.value) {
    new Chart(lineRef.value, {
      type: 'line',
      data: {
        labels: ['Mo','Di','Mi','Do','Fr','Sa','So'],
        datasets: [{
          data: [142,189,234,198,276,312,289],
          borderColor: '#6C3FE8',
          backgroundColor: 'rgba(108,63,232,0.08)',
          borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#545870', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#545870', font: { size: 11 } } }
        }
      }
    })
  }

  if (doughnutRef.value) {
    new Chart(doughnutRef.value, {
      type: 'doughnut',
      data: {
        labels: ['Direkt', 'Organisch', 'Referral', 'Social'],
        datasets: [{ data: [42, 31, 18, 9], backgroundColor: ['#6C3FE8','#00D4B4','#F0B428','#E05C5C'], borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, position: 'bottom', labels: { color: '#8B8FA8', font: { size: 11 } } } }
      }
    })
  }
})
</script>
