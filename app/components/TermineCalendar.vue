<template>
  <div class="cal card">
    <div class="cal-head">
      <div class="cal-nav">
        <button class="icon-btn" :title="tr('Zurück')" @click="step(-1)"><i class="ti ti-chevron-left"></i></button>
        <button class="icon-btn" style="width:auto;padding:0 12px;font-size:12px" @click="goToday">{{ tr('Heute') }}</button>
        <button class="icon-btn" :title="tr('Weiter')" @click="step(1)"><i class="ti ti-chevron-right"></i></button>
        <strong class="cal-title">{{ title }}</strong>
      </div>
      <div class="cal-ctl">
        <label class="cal-chk"><input type="checkbox" v-model="showCancelled" /> {{ tr('Stornierte zeigen') }}</label>
        <div class="seg"><button v-for="v in VIEWS" :key="v.key" :class="{ on: view === v.key }" @click="view = v.key as any">{{ v.label }}</button></div>
      </div>
    </div>

    <!-- MONAT -->
    <div v-if="view === 'month'" class="month">
      <div class="dow" v-for="d in DOW" :key="d">{{ d }}</div>
      <div v-for="c in monthCells" :key="c.iso" class="mcell" :class="{ out: !c.inMonth, today: c.iso === today }" @click="openDay(c.iso)">
        <div class="mnum">{{ c.n }}</div>
        <button v-for="b in c.items.slice(0, 3)" :key="b.bookingId" class="chip" :class="chipClass(b)" :title="tip(b)" @click.stop="$emit('open', b)">{{ b.startTime }} {{ b.customerName }}</button>
        <div v-if="c.items.length > 3" class="more">+{{ c.items.length - 3 }} {{ tr('weitere') }}</div>
      </div>
    </div>

    <!-- WOCHE / TAG -->
    <div v-else class="grid-wrap">
      <div class="gh">
        <div class="gutter"></div>
        <div v-for="d in dayCols" :key="d.iso" class="gcol-h" :class="{ today: d.iso === today }" @click="view === 'week' && openDay(d.iso)"><span>{{ d.wd }}</span><strong>{{ d.n }}</strong></div>
      </div>
      <div class="gb" :style="{ height: (hours.length * HOUR_PX) + 'px' }">
        <div class="gutter"><div v-for="h in hours" :key="h" class="hl" :style="{ height: HOUR_PX + 'px' }">{{ String(h).padStart(2, '0') }}:00</div></div>
        <div v-for="d in dayCols" :key="d.iso" class="gcol" :class="{ today: d.iso === today }" @click="clickCol($event, d.iso)">
          <div v-for="h in hours" :key="h" class="hr" :style="{ height: HOUR_PX + 'px' }"></div>
          <div v-if="d.iso === today && nowTop !== null" class="now" :style="{ top: nowTop + 'px' }"></div>
          <button v-for="e in d.events" :key="e.b.bookingId" class="ev" :class="[chipClass(e.b), { tall: e.height >= 44 }]" :style="{ top: e.top + 'px', height: e.height + 'px', left: e.left + '%', width: e.width + '%' }" :title="tip(e.b)" @click.stop="$emit('open', e.b)">
            <strong>{{ e.b.startTime }}</strong> {{ e.b.customerName }}<span class="et">{{ e.b.typeName }}</span>
          </button>
        </div>
      </div>
    </div>
    <div class="legend"><span><i class="sw video"></i> {{ tr('Video') }}</span><span><i class="sw phone"></i> {{ tr('Telefon') }}</span><span v-if="showCancelled"><i class="sw cancelled"></i> {{ tr('Storniert') }}</span><span style="margin-left:auto">{{ tr('Klick auf eine freie Stelle trägt einen Termin ein') }}</span></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

// Eigener Terminkalender (Monat, Woche, Tag) für die Buchungen. Zeigt nur an und meldet Klicks; Anlegen/Stornieren macht die Terminseite.
interface Booking { bookingId: string; typeName: string; date: string; startTime: string; endTime: string; customerName: string; channel?: string; status: string }
const props = defineProps<{ bookings: Booking[]; canCreate?: boolean }>()
const emit = defineEmits<{ (e: 'new', date: string, time: string): void; (e: 'open', b: any): void }>()

const VIEWS = [{ key: 'month', label: 'Monat' }, { key: 'week', label: 'Woche' }, { key: 'day', label: 'Tag' }]
const DOW = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const HOUR_PX = 52
const view = ref<'month' | 'week' | 'day'>('week')
const showCancelled = ref(false)
const pad = (n: number) => String(n).padStart(2, '0')
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`      // lokales Datum, nicht UTC
const parse = (s: string) => new Date(s + 'T00:00:00')
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const today = iso(new Date())
const anchor = ref(parse(today))
const mins = (hhmm: string) => { const [h, m] = (hhmm || '0:0').split(':').map(Number); return h * 60 + (m || 0) }

const visible = computed(() => props.bookings.filter(b => showCancelled.value || b.status !== 'cancelled'))
const byDate = computed(() => { const m = new Map<string, Booking[]>(); for (const b of visible.value) { (m.get(b.date) || m.set(b.date, []).get(b.date)!).push(b) } for (const l of m.values()) l.sort((a, b) => a.startTime.localeCompare(b.startTime)); return m })

const weekStart = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }
const title = computed(() => {
  const d = anchor.value
  if (view.value === 'month') return d.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  if (view.value === 'day') return d.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const s = weekStart(d), e = addDays(s, 6)
  return `${s.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – ${e.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
})
function step(n: number) {
  const d = new Date(anchor.value)
  if (view.value === 'month') d.setMonth(d.getMonth() + n, 1); else d.setDate(d.getDate() + (view.value === 'week' ? 7 * n : n))
  anchor.value = d
}
const goToday = () => { anchor.value = parse(today) }
function openDay(date: string) { anchor.value = parse(date); view.value = 'day' }

const monthCells = computed(() => {
  const first = new Date(anchor.value.getFullYear(), anchor.value.getMonth(), 1)
  const start = weekStart(first)
  return Array.from({ length: 42 }, (_, i) => { const d = addDays(start, i); const k = iso(d); return { iso: k, n: d.getDate(), inMonth: d.getMonth() === first.getMonth(), items: byDate.value.get(k) || [] } })
})

// Zeitraster: Standard 7 bis 20 Uhr, wird bei Terminen außerhalb erweitert
const hours = computed(() => {
  let lo = 7, hi = 20
  const days = view.value === 'day' ? [iso(anchor.value)] : Array.from({ length: 7 }, (_, i) => iso(addDays(weekStart(anchor.value), i)))
  for (const k of days) for (const b of byDate.value.get(k) || []) { lo = Math.min(lo, Math.floor(mins(b.startTime) / 60)); hi = Math.max(hi, Math.ceil(mins(b.endTime) / 60)) }
  return Array.from({ length: Math.max(1, hi - lo) }, (_, i) => lo + i)
})
const dayCols = computed(() => {
  const list = view.value === 'day' ? [anchor.value] : Array.from({ length: 7 }, (_, i) => addDays(weekStart(anchor.value), i))
  const base = hours.value[0] * 60
  return list.map(d => {
    const k = iso(d), items = byDate.value.get(k) || []
    // Überschneidende Termine nebeneinander legen
    const placed = items.map(b => ({ b, s: mins(b.startTime), e: Math.max(mins(b.endTime), mins(b.startTime) + 20), col: 0, cols: 1 }))
    for (const p of placed) { const used = placed.filter(o => o !== p && o.col !== undefined && o.s < p.e && p.s < o.e && placed.indexOf(o) < placed.indexOf(p)).map(o => o.col); while (used.includes(p.col)) p.col++ }
    for (const p of placed) p.cols = Math.max(...placed.filter(o => o.s < p.e && p.s < o.e).map(o => o.col)) + 1
    return { iso: k, n: d.getDate(), wd: d.toLocaleDateString('de-DE', { weekday: 'short' }), events: placed.map(p => ({ b: p.b, top: (p.s - base) / 60 * HOUR_PX, height: Math.max(22, (p.e - p.s) / 60 * HOUR_PX - 2), left: p.col * 100 / p.cols, width: 100 / p.cols })) }
  })
})
const nowTop = computed(() => { const n = new Date(); const t = n.getHours() * 60 + n.getMinutes(); const base = hours.value[0] * 60; return t >= base && t <= (hours.value[hours.value.length - 1] + 1) * 60 ? (t - base) / 60 * HOUR_PX : null })

function clickCol(ev: MouseEvent, date: string) {
  if (props.canCreate === false) return
  const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect()
  const minutes = hours.value[0] * 60 + Math.floor((ev.clientY - rect.top) / HOUR_PX * 2) * 30      // auf halbe Stunden gerastet
  emit('new', date, `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`)
}
const chipClass = (b: Booking) => (b.status === 'cancelled' ? 'cancelled' : b.channel === 'phone' ? 'phone' : 'video')
const tip = (b: Booking) => `${b.startTime}–${b.endTime} · ${b.customerName} · ${b.typeName}`
</script>

<style scoped>
.cal { padding: 14px }
.cal-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px }
.cal-nav, .cal-ctl { display: flex; align-items: center; gap: 8px; flex-wrap: wrap }
.cal-title { font-size: 16px; margin-left: 8px; text-transform: capitalize }
.cal-chk { font-size: 12px; color: var(--text-muted); display: inline-flex; gap: 6px; align-items: center; cursor: pointer }
.seg { display: inline-flex; border: 0.5px solid var(--border); border-radius: 10px; overflow: hidden }
.seg button { border: none; background: var(--bg-surface); padding: 6px 14px; font-size: 12px; cursor: pointer; color: var(--text) }
.seg button.on { background: var(--accent); color: #fff }
.month { display: grid; grid-template-columns: repeat(7, 1fr); border-top: 0.5px solid var(--border); border-left: 0.5px solid var(--border) }
.dow { padding: 6px; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted); border-right: 0.5px solid var(--border); border-bottom: 0.5px solid var(--border) }
.mcell { min-height: 104px; padding: 4px; border-right: 0.5px solid var(--border); border-bottom: 0.5px solid var(--border); cursor: pointer; display: flex; flex-direction: column; gap: 3px; overflow: hidden }
.mcell:hover { background: var(--bg-elevated, #00000008) } .mcell.out { opacity: .45 } .mcell.today .mnum { background: var(--accent); color: #fff; border-radius: 50% }
.mnum { font-size: 12px; font-weight: 700; width: 22px; height: 22px; display: inline-flex; align-items: center; justify-content: center }
.chip { text-align: left; border: none; border-radius: 5px; padding: 2px 6px; font-size: 11px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff }
.more { font-size: 11px; color: var(--text-muted); padding-left: 4px }
.grid-wrap { overflow-x: auto }
.gh, .gb { display: grid; grid-template-columns: 54px repeat(v-bind('dayCols.length'), minmax(90px, 1fr)); min-width: 560px }
.gh { border-bottom: 0.5px solid var(--border) }
.gcol-h { text-align: center; padding: 6px 2px; font-size: 12px; display: flex; flex-direction: column; border-left: 0.5px solid var(--border); cursor: pointer }
.gcol-h strong { font-size: 18px } .gcol-h.today strong { color: var(--accent) } .gcol-h span { text-transform: capitalize; color: var(--text-muted) }
.gb { position: relative }
.gutter { font-size: 10px; color: var(--text-muted) } .hl { padding: 2px 6px 0 0; text-align: right; box-sizing: border-box }
.gcol { position: relative; border-left: 0.5px solid var(--border); cursor: cell } .gcol.today { background: rgba(108, 63, 232, .04) }
.hr { border-top: 0.5px solid var(--border); box-sizing: border-box }
.now { position: absolute; left: 0; right: 0; height: 2px; background: #E05C5C; z-index: 3; pointer-events: none }
.ev { position: absolute; border: none; border-radius: 6px; padding: 2px 5px; font-size: 11px; text-align: left; color: #fff; cursor: pointer; overflow: hidden; z-index: 2; line-height: 1.25; box-sizing: border-box; border: 1px solid rgba(255,255,255,.35) }
.ev { white-space: nowrap; text-overflow: ellipsis }
.ev .et { display: none; opacity: .85; font-size: 10px; overflow: hidden; text-overflow: ellipsis }
.ev.tall .et { display: block }
.video { background: #4F46E5 } .phone { background: #0E9F6E } .cancelled { background: #8a93a6; text-decoration: line-through }
.sw { display: inline-block; width: 11px; height: 11px; border-radius: 3px; vertical-align: -1px; margin-right: 4px }
.legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); margin-top: 10px }
</style>
