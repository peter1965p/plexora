<template>
  <div class="page">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div>
        <h1 style="font-size:22px;font-weight:800;margin:0"><i class="ti ti-shield-lock" style="color:var(--accent);margin-right:8px"></i>PSC <span style="color:var(--accent)">Manager</span></h1>
        <p style="color:var(--text-muted);font-size:13px;margin:4px 0 0">Plexora Sicherheits-Center: Zustand der Plattform, Schutz, Sicherung und Notfall-Vorsorge</p>
      </div>
      <button v-if="admin && tab === 'overview'" class="accent-btn" :disabled="loading" @click="load(true)"><i class="ti" :class="loading ? 'ti-loader-2 spin' : 'ti-refresh'"></i> Aktualisieren</button>
    </div>

    <div v-if="!ready" style="padding:40px;text-align:center;color:var(--text-muted)"><i class="ti ti-loader-2 spin"></i></div>
    <div v-else-if="!admin" class="card" style="padding:32px;text-align:center;color:var(--text-muted);font-size:13px"><i class="ti ti-lock" style="font-size:22px;display:block;margin-bottom:8px"></i>Das PSC Manager zeigt die echte Infrastruktur und ist nur für den Plattform-Betreiber sichtbar.</div>

    <template v-else>
      <div class="psc-tabs">
        <button v-for="t in TABS" :key="t.key" class="psc-tab" :class="{ on: tab === t.key }" @click="setTab(t.key)"><i class="ti" :class="t.icon"></i> {{ t.label }}</button>
      </div>

      <!-- ═══ ÜBERSICHT ═══ -->
      <template v-if="tab === 'overview'">
        <div v-if="error" class="err" style="margin-bottom:12px">{{ error }}</div>

        <div class="psc-card" :style="{ borderTopColor: LEVEL_COLOR[monitorLevel] }">
          <div class="psc-head"><span class="psc-title">Plattform-Monitor</span><span class="psc-meta" v-if="rt">{{ rt.region }} · Node {{ rt.node }} · Version {{ rt.functionVersion || '—' }}</span></div>
          <div class="psc-cols">
            <div class="psc-col">
              <div class="psc-label">Gleichzeitige Ausführungen</div>
              <template v-if="lam">
                <div class="psc-bar"><i :style="barStyle(concLevel, concPct)"></i></div>
                <div class="psc-big">{{ lam.concurrentNow }} <small>jetzt gleichzeitig</small></div>
                <div class="psc-sub">von {{ cap }} {{ lam.reserved ? 'reserviert' : 'erlaubt' }} · Konto-Limit {{ lam.accountLimit }}</div>
              </template>
              <div v-else class="psc-na">{{ na(ov?.lambda) }}</div>
            </div>
            <div class="psc-col">
              <div class="psc-label">Anfragen (24 Std.)</div>
              <template v-if="lam">
                <div class="psc-bar"><i :style="barStyle(errLevel, errPct)"></i></div>
                <div class="psc-big" style="margin-bottom:2px">{{ nf(lam.invocations24h) }}</div>
                <div class="psc-sub">Anfragen · {{ lam.throttles24h }} gedrosselt · {{ lam.errors24h }} Fehler · Ø {{ lam.avgMs }} ms</div>
                <svg v-if="chart" class="psc-spark" :viewBox="`0 0 ${chart.w} ${chart.h}`" preserveAspectRatio="none" role="img" aria-label="Anfragen je Stunde der letzten 24 Stunden">
                  <g v-for="b in chart.bars" :key="b.i">
                    <title>{{ b.label }}: {{ nf(b.inv) }} Anfragen{{ b.thr ? `, ${b.thr} gedrosselt` : '' }}</title>
                    <rect :x="b.x" :y="b.y" :width="chart.bw" :height="b.h" rx="1.5" :fill="LEVEL_COLOR.ok" opacity=".55" />
                    <rect v-if="b.thr" :x="b.x" :y="b.ty" :width="chart.bw" :height="b.th" rx="1.5" :fill="LEVEL_COLOR.bad" />
                  </g>
                </svg>
                <div v-if="chart" class="psc-axis"><span>vor 24 Std.</span><span>jetzt</span></div>
              </template>
              <div v-else class="psc-na">{{ na(ov?.lambda) }}</div>
            </div>
            <div class="psc-col">
              <div class="psc-label">Datenbank · Wiederherstellung</div>
              <template v-if="db">
                <div class="psc-bar"><i :style="barStyle(recLevel, recPct)"></i></div>
                <div class="psc-big">{{ db.tables }} <small>Tabellen</small></div>
                <div class="psc-sub">{{ nf(db.items) }} Datensätze · {{ mbText(db.bytes) }}</div>
                <div class="psc-sub" :style="{ color: LEVEL_COLOR[recLevel] }">{{ db.pitrEnabled }} von {{ db.tables }} wiederherstellbar</div>
              </template>
              <div v-else class="psc-na">{{ na(ov?.db) }}</div>
            </div>
            <div class="psc-col">
              <div class="psc-label">Funktion plexora-api</div>
              <template v-if="lam">
                <div class="psc-bar"><i :style="barStyle(memLevel, memPct)"></i></div>
                <div class="psc-big" style="color:var(--accent)">{{ lam.memoryMb }} <small>MB</small></div>
                <div class="psc-sub">{{ lam.runtime }} · Zeitlimit {{ lam.timeoutS }} s</div>
                <div class="psc-sub" v-if="rt">belegt {{ rt.rssMb }} MB · läuft seit {{ Math.round(rt.uptimeS / 60) }} Min.</div>
              </template>
              <div v-else class="psc-na">{{ na(ov?.lambda) }}</div>
            </div>
          </div>
        </div>

        <div class="psc-tiles">
          <div class="psc-tile" :style="{ borderTopColor: LEVEL_COLOR[protLevel] }">
            <div class="psc-label">Schutz</div>
            <template v-if="pr">
              <div class="psc-big" :style="{ color: pr.roles && pr.plan ? LEVEL_COLOR.ok : LEVEL_COLOR.warn }">{{ pr.roles && pr.plan ? 'Scharf' : 'Beobachtung' }}</div>
              <div class="psc-dots"><span v-for="d in dots" :key="d.k"><i :style="{ background: d.on ? LEVEL_COLOR.ok : LEVEL_COLOR.warn }"></i>{{ d.k }}</span></div>
            </template>
            <div v-else class="psc-na">{{ na(ov?.protection) }}</div>
          </div>
          <div class="psc-tile" :style="{ borderTopColor: LEVEL_COLOR[demoLevel] }">
            <div class="psc-label">Demo-Pool</div>
            <template v-if="demo">
              <div class="psc-big">{{ demo.leased }} <small>/ {{ demo.poolSize }} belegt</small></div>
              <div class="psc-sub">{{ demo.dirty }} Konto(en) verändert · zuletzt zurückgesetzt {{ age(demo.lastReset) }}</div>
            </template>
            <div v-else class="psc-na">{{ na(ov?.demo) }}</div>
          </div>
          <div class="psc-tile" :style="{ borderTopColor: LEVEL_COLOR[bkLevel] }">
            <div class="psc-label">Gesamtsicherung</div>
            <template v-if="bk">
              <div class="psc-big" :style="{ color: LEVEL_COLOR[bkLevel] }">{{ bk.last ? age(bk.last.at) : 'keine' }}</div>
              <div class="psc-sub">außerhalb von AWS: <strong :style="{ color: bk.external ? LEVEL_COLOR.ok : LEVEL_COLOR.bad }">{{ bk.external ? 'ja' : 'nein' }}</strong></div>
            </template>
            <div v-else class="psc-na">{{ na(ov?.backups) }}</div>
          </div>
          <div class="psc-tile" :style="{ borderTopColor: LEVEL_COLOR.warn }">
            <div class="psc-label">Notfall-Bereitschaft</div>
            <div class="psc-big" style="color:var(--text-muted)">In Aufbau</div>
            <div class="psc-sub">PostgreSQL / MySQL als Ausweichsystem, siehe Reiter „Sicherung &amp; Notfall“</div>
          </div>
        </div>

        <div class="psc-card" style="margin-top:12px">
          <div class="psc-head"><span class="psc-title">Hinweise</span><span class="psc-meta" v-if="ov">Stand {{ age(ov.generatedAt) }}</span></div>
          <div v-if="!advice.length" class="psc-ok"><i class="ti ti-circle-check"></i> Keine offenen Hinweise.</div>
          <ul v-else class="psc-advice">
            <li v-for="(a, i) in advice" :key="i" :class="{ go: a.to }" :tabindex="a.to ? 0 : -1" :role="a.to ? 'link' : undefined" @click="go(a.to)" @keydown.enter="go(a.to)">
              <i class="ti" :class="a.level === 'bad' ? 'ti-alert-octagon' : 'ti-alert-triangle'" :style="{ color: LEVEL_COLOR[a.level] }"></i><span>{{ a.text }}</span>
              <i v-if="a.to" class="ti ti-chevron-right psc-go"></i>
            </li>
          </ul>
        </div>
      </template>

      <!-- ═══ INFRASTRUKTUR / DATENINTEGRITÄT ═══ -->
      <PscInfra v-else-if="tab === 'infra'" />
      <PscIntegrity v-else-if="tab === 'integrity'" />

      <!-- ═══ SICHERUNG & NOTFALL ═══ -->
      <div v-else-if="tab === 'notfall'" class="psc-card">
        <div class="psc-head"><span class="psc-title">Sicherung &amp; Notfall</span></div>
        <p style="font-size:13px;color:var(--text-secondary);margin:0 0 14px;line-height:1.6">Ziel: Plexora läuft auch dann weiter, wenn AWS nicht mehr zur Verfügung steht. Dazu braucht es eine vollständige Sicherung außerhalb von AWS und ein Ausweichsystem auf PostgreSQL oder MySQL.</p>
        <ol class="psc-steps">
          <li v-for="s in STEPS" :key="s.t"><i class="ti" :class="s.done ? 'ti-circle-check' : 'ti-circle-dashed'" :style="{ color: s.done ? LEVEL_COLOR.ok : 'var(--text-muted)' }"></i><div><strong>{{ s.t }}</strong><div>{{ s.d }}</div></div></li>
        </ol>
        <NuxtLink to="/settings?tab=backup" class="accent-btn" style="display:inline-flex;text-decoration:none;margin-top:6px"><i class="ti ti-database-export"></i> Zu den vorhandenen Sicherungen (Einstellungen)</NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { LEVEL_COLOR, loadLevel, errorLevel, recoveryLevel, backupLevel, pct, ageText, adviceFrom, mb, type Level } from '~~/shared/psc'
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute(), router = useRouter()
const TABS = [{ key: 'overview', label: 'Übersicht', icon: 'ti-layout-dashboard' }, { key: 'infra', label: 'Infrastruktur', icon: 'ti-cloud' }, { key: 'integrity', label: 'Datenintegrität', icon: 'ti-database-cog' }, { key: 'notfall', label: 'Sicherung & Notfall', icon: 'ti-lifebuoy' }]
const tab = ref(TABS.some(t => t.key === route.query.tab) ? String(route.query.tab) : 'overview')
const setTab = (k: string) => { tab.value = k; router.replace({ query: k === 'overview' ? {} : { tab: k } }) }

const ready = ref(false), admin = ref(false), loading = ref(false), error = ref(''), ov = ref<any>(null)
const lam = computed(() => ov.value?.lambda?.ok ? ov.value.lambda.data : null)
const db = computed(() => ov.value?.db?.ok ? ov.value.db.data : null)
const pr = computed(() => ov.value?.protection?.ok ? ov.value.protection.data : null)
const demo = computed(() => ov.value?.demo?.ok ? ov.value.demo.data : null)
const bk = computed(() => ov.value?.backups?.ok ? ov.value.backups.data : null)
const rt = computed(() => ov.value?.runtime?.ok ? ov.value.runtime.data : null)
const cap = computed(() => lam.value ? (lam.value.reserved || lam.value.accountLimit) : 0)
const concPct = computed(() => lam.value ? pct(lam.value.concurrentNow, cap.value) : 0)
const concLevel = computed<Level>(() => lam.value ? loadLevel(lam.value.concurrentNow, cap.value) : 'off')
const errLevel = computed<Level>(() => lam.value ? errorLevel(lam.value.errors24h, lam.value.throttles24h, lam.value.invocations24h) : 'off')
const errPct = computed(() => lam.value ? Math.min(100, Math.round(((lam.value.errors24h + lam.value.throttles24h) / Math.max(1, lam.value.invocations24h + lam.value.throttles24h)) * 100)) : 0)
const recLevel = computed<Level>(() => db.value ? recoveryLevel(db.value.pitrEnabled, db.value.tables) : 'off')
const bkLevel = computed<Level>(() => backupLevel(bk.value?.last?.at))
const recPct = computed(() => db.value ? pct(db.value.pitrEnabled, db.value.tables) : 0)
const memPct = computed(() => lam.value && rt.value ? pct(rt.value.rssMb, lam.value.memoryMb) : 0)
const memLevel = computed<Level>(() => lam.value && rt.value ? loadLevel(rt.value.rssMb, lam.value.memoryMb) : 'off')
const worst = (...l: Level[]): Level => (['bad', 'warn', 'ok', 'off'] as Level[]).find(x => l.includes(x)) || 'off'
const monitorLevel = computed<Level>(() => worst(...(lam.value ? [concLevel.value, errLevel.value, memLevel.value] : []), ...(db.value ? [recLevel.value] : [])))
const protLevel = computed<Level>(() => !pr.value ? 'off' : pr.value.roles && pr.value.plan && pr.value.auth ? 'ok' : 'warn')
const demoLevel = computed<Level>(() => !demo.value ? 'off' : loadLevel(demo.value.leased, demo.value.poolSize) === 'ok' ? 'ok' : loadLevel(demo.value.leased, demo.value.poolSize))
// Verlauf der Anfragen je Stunde (Säulen; gedrosselte rot in der Säule)
const chart = computed(() => {
  const sr = lam.value?.series; if (!sr) return null
  const w = 240, h = 40, n = sr.invocations.length, gap = 2, bw = (w - gap * (n - 1)) / n
  const max = Math.max(1, ...sr.invocations.map((v: number, i: number) => v + (sr.throttles[i] || 0)))
  const bars = sr.invocations.map((inv: number, i: number) => {
    const thr = sr.throttles[i] || 0, total = inv + thr, bh = total ? Math.max(2, (total / max) * (h - 2)) : 1, th = thr ? Math.max(2, (thr / Math.max(1, total)) * bh) : 0
    const hr = new Date(sr.from + i * 3_600_000).getHours()
    return { i, x: i * (bw + gap), y: h - bh, h: bh, ty: h - th, th, inv, thr, label: `${String(hr).padStart(2, '0')}:00 Uhr` }
  })
  return { w, h, bw, bars }
})
const go = (to?: string) => { if (!to) return; if (to.startsWith('tab:')) { setTab(to.slice(4)); window.scrollTo({ top: 0, behavior: 'smooth' }) } else router.push(to) }
const dots = computed(() => pr.value ? [{ k: 'Rollen', on: pr.value.roles }, { k: 'Tarif', on: pr.value.plan }, { k: 'Anmeldung', on: pr.value.auth }] : [])
const advice = computed(() => adviceFrom(ov.value))
const barStyle = (l: Level, p: number) => ({ width: Math.max(p, 2) + '%', background: LEVEL_COLOR[l] })
const nf = (n: number) => Number(n || 0).toLocaleString('de-DE')
const mbText = (b: number) => (b >= 1048576 ? `${mb(b).toLocaleString('de-DE')} MB` : `${Math.round(b / 1024).toLocaleString('de-DE')} KB`)
const age = (iso?: string) => ageText(iso)
const na = (s: any) => (s && s.ok === false ? `nicht verfügbar (${s.error})` : '—')
const STEPS = [
  { t: '1. Gesamtsicherung herunterladen', d: 'Alle Tabellen und Dateien als verschlüsseltes Archiv in einem neutralen Format.', done: false },
  { t: '2. Sicherung außerhalb von AWS', d: 'Regelmäßig automatisch zu einem anderen Anbieter hochladen.', done: false },
  { t: '3. Umstrukturierung auf PostgreSQL', d: 'Sicherung in eine PostgreSQL-Datenbank einlesen; eine Kompatibilitätsschicht lässt Plexora unverändert darauf laufen.', done: false },
  { t: '4. Notfall-Server', d: 'Plexora als eigenständiger Server (Docker) mit eigener Anmeldung, Dateispeicher und Zeitplänen, samt Anleitung.', done: false },
  { t: '5. MySQL', d: 'Dieselbe Schicht auch für MySQL.', done: false },
  { t: '6. Notfall-Übung', d: 'Einmal komplett durchspielen: Läuft Plexora aus der Sicherung auf einem leeren Server?', done: false },
]

async function load(refresh = false) {
  loading.value = true; error.value = ''
  try {
    const { useAuthHeader } = await import('~/composables/useAuth')
    ov.value = await $fetch(useApiUrl('/api/admin/psc/overview' + (refresh ? '?refresh=1' : '')), { headers: await useAuthHeader() })
  } catch (e: any) { error.value = e?.data?.message || 'Die Übersicht konnte nicht geladen werden.' } finally { loading.value = false }
}
onMounted(async () => {
  try { const { useAuthUser } = await import('~/composables/useAuth'); const u = await useAuthUser(); admin.value = u.role === 'admins' } catch { /* gesperrt */ }
  ready.value = true
  if (admin.value) { await load(); timer = setInterval(() => { if (tab.value === 'overview') load() }, 60_000) }
})
let timer: any
onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.psc-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; border-bottom: 0.5px solid var(--border) }
.psc-tab { display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer }
.psc-tab.on { color: var(--accent); border-bottom-color: var(--accent) }
.psc-card { background: var(--bg-surface); border: 0.5px solid var(--border); border-top: 3px solid var(--border); border-radius: 14px; padding: 18px 20px }
.psc-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px }
.psc-title { font-weight: 700; font-size: 14px }
.psc-meta { font-size: 11px; color: var(--text-muted) }
.psc-cols { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px }
.psc-col { min-width: 0 }
.psc-label { font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px }
.psc-big { font-size: 26px; font-weight: 800; line-height: 1.15; margin-bottom: 6px }
.psc-big small { font-size: 12px; font-weight: 600; color: var(--text-muted) }
.psc-bar { height: 8px; border-radius: 99px; background: var(--bg-hover); overflow: hidden; margin: 6px 0 8px }
.psc-bar i { display: block; height: 100%; border-radius: 99px; transition: width .4s }
.psc-sub { font-size: 12px; color: var(--text-secondary); line-height: 1.5 }
.psc-na { font-size: 12px; color: var(--text-muted) }
.psc-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 12px }
.psc-tile { background: var(--bg-surface); border: 0.5px solid var(--border); border-top: 3px solid var(--border); border-radius: 14px; padding: 16px 18px; min-width: 0 }
.psc-dots { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--text-secondary) }
.psc-dots span { display: inline-flex; align-items: center; gap: 5px }
.psc-dots i { width: 8px; height: 8px; border-radius: 50% }
.psc-advice { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px }
.psc-advice li { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.5; padding: 7px 10px; margin: 0 -10px; border-radius: 10px }
.psc-advice li span { flex: 1 }
.psc-advice li.go { cursor: pointer }
.psc-advice li.go:hover, .psc-advice li.go:focus-visible { background: var(--bg-hover); outline: none }
.psc-go { color: var(--text-muted); margin-top: 2px }
.psc-spark { width: 100%; height: 40px; margin-top: 8px; display: block }
.psc-axis { display: flex; justify-content: space-between; font-size: 10px; color: var(--text-muted); margin-top: 2px }
.psc-ok { color: #10b981; font-size: 13px }
.psc-steps { margin: 0 0 14px; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 12px }
.psc-steps li { display: flex; gap: 12px; font-size: 13px; line-height: 1.5 }
.psc-steps li i { font-size: 20px; margin-top: 1px }
.psc-steps li div div { color: var(--text-secondary); font-size: 12px }
.err { padding: 10px 12px; border-radius: 8px; background: rgba(224,92,92,.12); color: #E05C5C; font-size: 12px }
@media (max-width: 1100px) { .psc-cols, .psc-tiles { grid-template-columns: repeat(2, 1fr) } }
@media (max-width: 600px) { .psc-cols, .psc-tiles { grid-template-columns: 1fr } }
</style>
