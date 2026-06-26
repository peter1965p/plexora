<template>
  <div class="page">

    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <div style="width:36px;height:36px;background:var(--accent);border-radius:10px;display:flex;align-items:center;justify-content:center">
        <i class="ti ti-chart-line" style="font-size:18px;color:#fff"></i>
      </div>
      <div>
        <div style="font-size:18px;font-weight:700">SEO & Traffic Analytics</div>
        <div style="font-size:12px;color:var(--text-muted)">app.plexora.eu — nur für dich sichtbar</div>
      </div>
      <button class="icon-btn" style="margin-left:auto" @click="reload" :disabled="loading">
        <i class="ti" :class="loading ? 'ti-loader-2 spin' : 'ti-refresh'"></i>
      </button>
    </div>

    <div v-if="loading" style="text-align:center;padding:60px;color:var(--text-muted)">
      <i class="ti ti-loader-2 spin" style="font-size:32px"></i>
    </div>

    <template v-else-if="stats">

      <!-- STAT CARDS -->
      <div class="stats-grid" style="margin-bottom:16px">
        <div class="stat-card">
          <i class="ti ti-users stat-icon"></i>
          <div class="stat-label">Echte Besucher</div>
          <div class="stat-value">{{ stats.humanTotal.toLocaleString('de-DE') }}</div>
          <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ stats.todayHuman }} heute</div>
        </div>
        <div class="stat-card">
          <i class="ti ti-robot stat-icon"></i>
          <div class="stat-label">Bots / Crawler</div>
          <div class="stat-value">{{ stats.botTotal.toLocaleString('de-DE') }}</div>
          <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ stats.todayBot }} heute</div>
        </div>
        <div class="stat-card">
          <i class="ti ti-eye stat-icon"></i>
          <div class="stat-label">Gesamt Aufrufe</div>
          <div class="stat-value">{{ (stats.humanTotal + stats.botTotal).toLocaleString('de-DE') }}</div>
          <div class="stat-delta up"><i class="ti ti-arrow-up-right"></i> {{ stats.todayHuman + stats.todayBot }} heute</div>
        </div>
        <div class="stat-card">
          <i class="ti ti-percentage stat-icon"></i>
          <div class="stat-label">Bot-Anteil</div>
          <div class="stat-value">{{ botRate }}%</div>
          <div class="stat-delta" :class="botRate > 50 ? 'danger' : 'up'">
            <i class="ti" :class="botRate > 50 ? 'ti-alert-triangle' : 'ti-check'"></i>
            {{ botRate > 50 ? 'viele Bots' : 'normal' }}
          </div>
        </div>
      </div>

      <!-- CHART: 30 Tage -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title">Aufrufe letzte 30 Tage</span>
          <div style="display:flex;gap:16px;font-size:11px;color:var(--text-muted)">
            <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--accent);margin-right:4px"></span>Besucher</span>
            <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#6C3FE8;margin-right:4px"></span>Bots</span>
          </div>
        </div>
        <div class="card-body" style="padding:16px 20px">
          <div style="display:flex;align-items:flex-end;gap:3px;height:80px">
            <div
              v-for="d in stats.days" :key="d.date"
              style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;cursor:default"
              :title="`${d.date}\nBesucher: ${d.human}\nBots: ${d.bot}`">
              <div :style="{
                width: '100%',
                background: '#6C3FE8',
                borderRadius: '2px 2px 0 0',
                height: maxDay > 0 ? `${Math.max(2, Math.round((d.bot / maxDay) * 36))}px` : '2px',
                opacity: 0.7,
              }"></div>
              <div :style="{
                width: '100%',
                background: 'var(--accent)',
                borderRadius: '2px 2px 0 0',
                height: maxDay > 0 ? `${Math.max(2, Math.round((d.human / maxDay) * 36))}px` : '2px',
              }"></div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--text-muted)">
            <span>{{ stats.days[0]?.date?.slice(5) }}</span>
            <span>{{ stats.days[14]?.date?.slice(5) }}</span>
            <span>{{ stats.days[29]?.date?.slice(5) }}</span>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:14px">

        <!-- TOP PAGES -->
        <div class="card">
          <div class="card-header"><span class="card-title">Top Seiten</span></div>
          <table class="data-table">
            <thead><tr><th>Seite</th><th style="text-align:right">Aufrufe</th></tr></thead>
            <tbody>
              <tr v-if="!stats.topPages.length">
                <td colspan="2" style="text-align:center;color:var(--text-muted);padding:24px">Noch keine Daten</td>
              </tr>
              <tr v-for="p in stats.topPages" :key="p.path">
                <td class="td-name" style="font-family:monospace;font-size:12px">{{ p.path }}</td>
                <td style="text-align:right;font-weight:600">{{ p.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- TOP REFERRER -->
        <div class="card">
          <div class="card-header"><span class="card-title">Traffic-Quellen</span></div>
          <table class="data-table">
            <thead><tr><th>Quelle</th><th style="text-align:right">Aufrufe</th></tr></thead>
            <tbody>
              <tr v-if="!stats.topRefs.length">
                <td colspan="2" style="text-align:center;color:var(--text-muted);padding:24px">Noch keine Daten</td>
              </tr>
              <tr v-for="r in stats.topRefs" :key="r.ref">
                <td class="td-name" style="font-size:12px">
                  <span v-if="r.ref === 'direct'" style="color:var(--text-muted)">— direkt / bookmark —</span>
                  <span v-else>{{ r.ref }}</span>
                </td>
                <td style="text-align:right;font-weight:600">{{ r.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- BROWSER / OS / COUNTRY / CITY -->
      <div class="grid-2" style="margin-bottom:14px">

        <!-- BROWSER -->
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-browser" style="color:var(--accent);margin-right:6px"></i>Browser</span></div>
          <div v-if="!stats.topBrowsers?.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Noch keine Daten</div>
          <div v-else style="padding:12px 16px;display:flex;flex-direction:column;gap:8px">
            <div v-for="b in stats.topBrowsers" :key="b.name" style="display:flex;align-items:center;gap:10px">
              <span style="font-size:13px;min-width:120px">{{ b.name }}</span>
              <div style="flex:1;background:var(--bg-elevated);border-radius:4px;height:6px;overflow:hidden">
                <div :style="`width:${Math.round((b.count/stats.topBrowsers[0].count)*100)}%;background:var(--accent);height:100%;border-radius:4px`"></div>
              </div>
              <span style="font-size:12px;font-weight:600;min-width:28px;text-align:right">{{ b.count }}</span>
            </div>
          </div>
        </div>

        <!-- OS -->
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-device-desktop" style="color:var(--accent);margin-right:6px"></i>Betriebssystem</span></div>
          <div v-if="!stats.topOss?.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Noch keine Daten</div>
          <div v-else style="padding:12px 16px;display:flex;flex-direction:column;gap:8px">
            <div v-for="o in stats.topOss" :key="o.name" style="display:flex;align-items:center;gap:10px">
              <span style="font-size:13px;min-width:120px">{{ osIcon(o.name) }} {{ o.name }}</span>
              <div style="flex:1;background:var(--bg-elevated);border-radius:4px;height:6px;overflow:hidden">
                <div :style="`width:${Math.round((o.count/stats.topOss[0].count)*100)}%;background:var(--accent);height:100%;border-radius:4px`"></div>
              </div>
              <span style="font-size:12px;font-weight:600;min-width:28px;text-align:right">{{ o.count }}</span>
            </div>
          </div>
        </div>

        <!-- COUNTRIES -->
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-world" style="color:var(--accent);margin-right:6px"></i>Länder</span></div>
          <div v-if="!stats.topCountries?.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Noch keine Daten</div>
          <div v-else style="padding:12px 16px;display:flex;flex-direction:column;gap:8px">
            <div v-for="c in stats.topCountries" :key="c.code" style="display:flex;align-items:center;gap:10px">
              <span style="font-size:16px;width:24px">{{ flag(c.code) }}</span>
              <span style="font-size:13px;min-width:80px">{{ countryName(c.code) }}</span>
              <div style="flex:1;background:var(--bg-elevated);border-radius:4px;height:6px;overflow:hidden">
                <div :style="`width:${Math.round((c.count/stats.topCountries[0].count)*100)}%;background:var(--accent);height:100%;border-radius:4px`"></div>
              </div>
              <span style="font-size:12px;font-weight:600;min-width:28px;text-align:right">{{ c.count }}</span>
            </div>
          </div>
        </div>

        <!-- CITIES -->
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="ti ti-building" style="color:var(--accent);margin-right:6px"></i>Städte</span></div>
          <div v-if="!stats.topCities?.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">Noch keine Daten</div>
          <table v-else class="data-table">
            <thead><tr><th>Stadt</th><th style="text-align:right">Aufrufe</th></tr></thead>
            <tbody>
              <tr v-for="c in stats.topCities" :key="c.city">
                <td style="font-size:13px">{{ c.city }}</td>
                <td style="text-align:right;font-weight:600">{{ c.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- BOT BREAKDOWN -->
      <div class="card" style="margin-bottom:14px">
        <div class="card-header">
          <span class="card-title"><i class="ti ti-robot" style="color:var(--accent);margin-right:6px"></i>Bot-Aufschlüsselung</span>
          <span style="font-size:11px;color:var(--text-muted)">{{ stats.bots.length }} verschiedene Crawler</span>
        </div>
        <div v-if="!stats.bots.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
          Noch keine Bot-Daten
        </div>
        <div v-else style="padding:16px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
          <div v-for="b in stats.bots" :key="b.name"
            style="display:flex;justify-content:space-between;align-items:center;background:var(--bg-elevated);border:0.5px solid var(--border);border-radius:8px;padding:10px 14px">
            <span style="font-size:12px;font-weight:500">{{ b.name }}</span>
            <span style="font-size:13px;font-weight:700;color:var(--accent)">{{ b.count }}</span>
          </div>
        </div>
      </div>

      <!-- RECENT IPs -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="ti ti-network" style="color:var(--accent);margin-right:6px"></i>Letzte Besucher-IPs</span>
          <span style="font-size:11px;color:var(--text-muted)">nur für Admin · letzte 100</span>
        </div>
        <div v-if="!stats.recentIps?.length" style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">
          Noch keine Daten
        </div>
        <table v-else class="data-table">
          <thead><tr><th>Zeit</th><th>IP</th><th>Land</th><th>Stadt</th><th>Seite</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in stats.recentIps.slice(0,20)" :key="i">
              <td style="font-size:11px;color:var(--text-muted);white-space:nowrap">{{ r.ts?.slice(0,16).replace('T',' ') }}</td>
              <td style="font-family:monospace;font-size:12px">{{ r.ip }}</td>
              <td style="font-size:14px">{{ flag(r.country) }}</td>
              <td style="font-size:12px">{{ r.city }}</td>
              <td style="font-family:monospace;font-size:12px;color:var(--text-muted)">{{ r.page }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </template>

    <div v-else style="text-align:center;padding:60px;color:var(--text-muted)">
      <i class="ti ti-lock" style="font-size:32px;display:block;margin-bottom:8px"></i>
      <div style="margin-bottom:8px">Kein Zugriff</div>
      <div v-if="error" style="font-size:11px;font-family:monospace;color:#E05C5C">{{ error }}</div>
    </div>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const stats   = ref<any>(null)
const loading = ref(true)
const error   = ref<string>('')

function flag(code: string): string {
  if (!code || code.length !== 2) return '🌍'
  return code.toUpperCase().replace(/./g, c => String.fromCodePoint(c.charCodeAt(0) + 127397))
}

const COUNTRY_NAMES: Record<string, string> = {
  DE:'Deutschland', AT:'Österreich', CH:'Schweiz', US:'USA', GB:'Großbritannien',
  FR:'Frankreich', NL:'Niederlande', BE:'Belgien', PL:'Polen', IT:'Italien',
  ES:'Spanien', RU:'Russland', UA:'Ukraine', TR:'Türkei', IN:'Indien',
  CN:'China', JP:'Japan', BR:'Brasilien', AU:'Australien', CA:'Kanada',
  LU:'Luxemburg', DK:'Dänemark', SE:'Schweden', NO:'Norwegen', FI:'Finnland',
  CZ:'Tschechien', SK:'Slowakei', HU:'Ungarn', RO:'Rumänien', XX:'Unbekannt',
}
function countryName(code: string): string {
  return COUNTRY_NAMES[code] || code
}

function osIcon(os: string): string {
  const icons: Record<string, string> = {
    Windows:'🪟', macOS:'🍎', Linux:'🐧', Android:'🤖', iOS:'📱', ChromeOS:'🌐', Other:'💻'
  }
  return icons[os] || '💻'
}

const botRate = computed(() => {
  if (!stats.value) return 0
  const total = stats.value.humanTotal + stats.value.botTotal
  if (!total) return 0
  return Math.round((stats.value.botTotal / total) * 100)
})

const maxDay = computed(() => {
  if (!stats.value?.days) return 0
  return Math.max(...stats.value.days.map((d: any) => d.human + d.bot), 1)
})

async function reload() {
  loading.value = true
  error.value = ''
  try {
    const data = await $fetch(useApiUrl('/api/admin/seo-stats')) as any
    stats.value = data
  } catch (e: any) {
    error.value = `${e?.statusCode || e?.status || '?'} — ${e?.message || e?.data?.message || 'API nicht erreichbar'}`
  } finally {
    loading.value = false
  }
}

onMounted(() => reload())
</script>
