<template>
  <div class="gt">
    <div class="gt-bar">
      <div class="seg"><button v-for="z in ZOOMS" :key="z.key" :class="{ on: zoom === z.key }" @click="zoom = z.key as any">{{ z.label }}</button></div>
      <label class="chk"><input type="checkbox" v-model="showCritical" /> Kritischer Pfad</label>
      <button class="mini" @click="scrollToToday"><i class="ti ti-calendar-event"></i> Heute</button>
      <span style="flex:1"></span>
      <span class="prog" :title="'Gesamtfortschritt (nach Dauer gewichtet)'">{{ total }} % fertig</span>
      <template v-if="!readonly"><button class="mini" @click="$emit('create', false)"><i class="ti ti-plus"></i> Vorgang</button><button class="mini" @click="$emit('create', true)"><i class="ti ti-diamond"></i> Meilenstein</button></template>
    </div>

    <div v-if="!rows.length" class="empty">Noch keine Vorgänge. Lege den ersten mit „Vorgang“ oder „Meilenstein“ an.</div>
    <div v-else ref="scroller" class="gt-scroll">
      <div class="gt-grid" :style="{ gridTemplateColumns: `${LEFT}px ${totalW}px` }">
        <!-- Kopf links -->
        <div class="gt-hl"><div class="c t">Vorgang</div><div class="c a">Zuständig</div><div class="c d">Start</div><div class="c d">Ende</div><div class="c n">Tage</div><div class="c n">%</div></div>
        <!-- Kopf rechts: Monate / Tage bzw. Wochen -->
        <div class="gt-hr" :style="{ width: totalW + 'px' }">
          <div class="mrow"><div v-for="m in monthCells" :key="m.key" class="mc" :style="{ left: m.x + 'px', width: m.w + 'px' }">{{ m.label }}</div></div>
          <div class="drow"><div v-for="d in tickCells" :key="d.key" class="dc" :class="{ we: d.weekend, today: d.today }" :style="{ left: d.x + 'px', width: d.w + 'px' }">{{ d.label }}</div></div>
        </div>

        <!-- Tabelle links -->
        <div class="gt-left">
          <div v-for="r in rows" :key="r.t.taskId" class="lrow" :class="{ sel: selected === r.t.taskId }" :style="{ height: ROW + 'px' }" @click="selected = r.t.taskId" @dblclick="!readonly && $emit('edit', r.t.taskId)">
            <div class="c t"><input v-if="!readonly" type="checkbox" :checked="(r.t.progress ?? 0) >= 100" title="Erledigt" @click.stop @change="toggleDone(r.t, ($event.target as HTMLInputElement).checked)" /><i v-if="r.t.milestone" class="ti ti-diamond" style="color:var(--accent)"></i><span class="tt" :title="r.t.title">{{ r.t.title }}</span></div>
            <div class="c a">{{ r.t.assignee || '–' }}</div>
            <div class="c d">{{ dateDe(r.t.startDate) }}</div>
            <div class="c d">{{ r.t.milestone ? '–' : dateDe(r.t.endDate) }}</div>
            <div class="c n">{{ r.t.milestone ? '◆' : duration(r.t) }}</div>
            <div class="c n">{{ r.t.progress ?? 0 }}</div>
          </div>
        </div>

        <!-- Zeitachse rechts -->
        <div class="gt-right" ref="timeline" :style="{ width: totalW + 'px', height: rows.length * ROW + 'px' }">
          <div v-for="w in weekendStripes" :key="w.x" class="wk" :style="{ left: w.x + 'px', width: w.w + 'px' }"></div>
          <div v-for="(r, i) in rows" :key="'l' + r.t.taskId" class="hl" :class="{ sel: selected === r.t.taskId }" :style="{ top: i * ROW + 'px', height: ROW + 'px' }"></div>
          <div v-if="todayX !== null" class="todayline" :style="{ left: todayX + 'px' }"></div>

          <svg class="arrows" :width="totalW" :height="rows.length * ROW">
            <defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8a93a6" /></marker><marker id="ahc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#E05C5C" /></marker></defs>
            <g v-for="a in arrows" :key="a.key" :class="{ crit: a.critical }" @click.stop="!readonly && removeDep(a)">
              <path :d="a.d" class="hit" /><path :d="a.d" class="ar" :marker-end="a.critical ? 'url(#ahc)' : 'url(#ah)'" />
            </g>
            <path v-if="link" :d="`M${link.x0},${link.y0} L${link.x1},${link.y1}`" class="linkdrag" />
          </svg>

          <div v-for="(r, i) in rows" :key="r.t.taskId" class="barwrap" :data-task="r.t.taskId" :style="{ top: i * ROW + 'px', height: ROW + 'px' }">
            <template v-if="r.t.milestone">
              <div class="ms" :class="{ crit: isCrit(r.t.taskId), done: (r.t.progress ?? 0) >= 100 }" :style="{ left: r.x + px / 2 - 9 + 'px' }" :title="tip(r.t)" @pointerdown="!readonly && startDrag($event, r.t, 'move')" @dblclick="!readonly && $emit('edit', r.t.taskId)"></div>
              <div class="mslabel" :style="{ left: r.x + px / 2 + 14 + 'px' }">{{ r.t.title }}</div>
            </template>
            <template v-else>
              <div class="bar" :class="{ crit: isCrit(r.t.taskId), done: (r.t.progress ?? 0) >= 100, dragging: drag?.taskId === r.t.taskId }" :style="{ left: r.x + 'px', width: Math.max(r.w, 6) + 'px' }" :title="tip(r.t)" @pointerdown="!readonly && startDrag($event, r.t, 'move')" @dblclick="!readonly && $emit('edit', r.t.taskId)">
                <div class="fill" :style="{ width: (r.t.progress ?? 0) + '%' }"></div>
                <span class="bl" v-if="r.w > 70">{{ r.t.title }}</span>
                <i v-if="!readonly" class="h hl2" @pointerdown.stop="startDrag($event, r.t, 'left')"></i>
                <i v-if="!readonly" class="h hr2" @pointerdown.stop="startDrag($event, r.t, 'right')"></i>
                <i v-if="!readonly && r.w > 30" class="ph" :style="{ left: (r.t.progress ?? 0) + '%' }" title="Fortschritt ziehen" @pointerdown.stop="startDrag($event, r.t, 'progress')"></i>
              </div>
              <span v-if="r.w <= 70" class="outlabel" :style="{ left: r.x + r.w + 10 + 'px' }">{{ r.t.title }}</span>
            </template>
            <i v-if="!readonly" class="dot" :style="{ left: (r.t.milestone ? r.x + px / 2 + 9 : r.x + r.w) + 4 + 'px' }" title="Zum Verknüpfen auf einen anderen Vorgang ziehen" @pointerdown.stop="startLink($event, r.t)"></i>
          </div>
          <div v-if="drag && dragLabel" class="dragtip" :style="{ left: dragTip.x + 'px', top: dragTip.y + 'px' }">{{ dragLabel }}</div>
        </div>
      </div>
    </div>
    <div class="legend"><span><i class="sw n"></i> Vorgang</span><span><i class="sw c"></i> kritisch</span><span><i class="sw dn"></i> erledigt</span><span><i class="ti ti-diamond"></i> Meilenstein</span><span style="margin-left:auto" v-if="!readonly">Ziehen: verschieben · Ränder: Dauer · unten: Fortschritt · Punkt rechts: verknüpfen · Doppelklick: bearbeiten</span></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { addDays, diffDays, duration, criticalPath, projectProgress, pushSuccessors, wouldCycle, isIsoDate, clampProgress, type GanttTask, type ScheduleChange } from '~~/shared/gantt'

// Gantt-Diagramm für einen Projektplan. Zeigt Vorgänge und Meilensteine, Abhängigkeiten (Pfeile), kritischen Pfad und erlaubt Ziehen mit der Maus.
// Die Komponente rechnet nur zur Vorschau; gespeichert wird über das Ereignis "change" (der Server prüft alles noch einmal).
const props = defineProps<{ tasks: any[]; readonly?: boolean }>()
const emit = defineEmits<{ (e: 'change', changes: ScheduleChange[]): void; (e: 'create', milestone: boolean): void; (e: 'edit', taskId: string): void; (e: 'error', msg: string): void }>()

const ZOOMS = [{ key: 'day', label: 'Tage' }, { key: 'week', label: 'Wochen' }, { key: 'month', label: 'Monate' }]
const PX = { day: 34, week: 12, month: 4 } as const
const ROW = 34, LEFT = 566
const zoom = ref<'day' | 'week' | 'month'>('day')
const px = computed(() => PX[zoom.value])
const showCritical = ref(true)
const selected = ref('')
const scroller = ref<HTMLElement | null>(null), timeline = ref<HTMLElement | null>(null)
const pad = (n: number) => String(n).padStart(2, '0')
const todayIso = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` })()
const dateDe = (iso: string) => (isIsoDate(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}` : '–')

// Vorgänge normalisieren (fehlende Daten: heute)
const base = computed<GanttTask[]>(() => props.tasks.map(t => { const s = isIsoDate(t.startDate) ? t.startDate : todayIso; const e = t.milestone ? s : (isIsoDate(t.endDate) && t.endDate >= s ? t.endDate : s); return { taskId: t.taskId, title: t.title || '(ohne Titel)', startDate: s, endDate: e, progress: clampProgress(t.progress ?? (t.status === 'done' ? 100 : 0)), milestone: t.milestone === true, predecessors: Array.isArray(t.predecessors) ? t.predecessors : [], assignee: t.assignee || '', status: t.status } }))

// ── Ziehen (Vorschau) ──
interface Drag { taskId: string; mode: 'move' | 'left' | 'right' | 'progress'; x0: number; delta: number; moved: boolean; progress?: number }
const drag = ref<Drag | null>(null)
const link = ref<{ fromId: string; x0: number; y0: number; x1: number; y1: number } | null>(null)
const dragTip = reactive({ x: 0, y: 0 })
const view = computed<GanttTask[]>(() => {
  const d = drag.value
  if (!d || !d.moved) return base.value
  const t = base.value.find(x => x.taskId === d.taskId)!
  let next = base.value.map(x => ({ ...x }))
  const me = next.find(x => x.taskId === d.taskId)!
  if (d.mode === 'progress') me.progress = d.progress ?? me.progress
  else if (d.mode === 'move') { me.startDate = addDays(t.startDate, d.delta); me.endDate = addDays(t.endDate, d.delta) }
  else if (d.mode === 'left') { const s = addDays(t.startDate, d.delta); me.startDate = s > t.endDate ? t.endDate : s }
  else { const e = addDays(t.endDate, d.delta); me.endDate = e < t.startDate ? t.startDate : e }
  if (me.milestone) me.endDate = me.startDate
  try { next = pushSuccessors(next) } catch { /* Kreis: ungeschoben anzeigen */ }
  return next
})
const sorted = computed(() => [...view.value].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title!.localeCompare(b.title!)))
const crit = computed(() => criticalPath(view.value))
const isCrit = (id: string) => showCritical.value && crit.value.criticalIds.has(id)
const total = computed(() => projectProgress(view.value))

// ── Zeitachse ──
const range = computed(() => {
  const t = view.value
  let lo = t.length ? t.reduce((m, x) => (x.startDate < m ? x.startDate : m), t[0].startDate) : todayIso
  let hi = t.length ? t.reduce((m, x) => (x.endDate > m ? x.endDate : m), t[0].endDate) : addDays(todayIso, 30)
  if (todayIso < lo) lo = todayIso
  lo = addDays(lo, -7); hi = addDays(hi, Math.max(21, 60 - diffDays(lo, hi)))
  // auf Montag zurück
  const dow = (new Date(lo + 'T00:00:00Z').getUTCDay() + 6) % 7
  return { start: addDays(lo, -dow), end: hi }
})
const days = computed(() => diffDays(range.value.start, range.value.end) + 1)
const totalW = computed(() => days.value * px.value)
const xOf = (iso: string) => diffDays(range.value.start, iso) * px.value
const todayX = computed(() => (todayIso >= range.value.start && todayIso <= range.value.end ? xOf(todayIso) + px.value / 2 : null))
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
const monthCells = computed(() => {
  const out: { key: string; label: string; x: number; w: number }[] = []
  let d = range.value.start
  while (d <= range.value.end) {
    const y = +d.slice(0, 4), m = +d.slice(5, 7)
    const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
    const end = last < range.value.end ? last : range.value.end
    out.push({ key: d, label: `${MONTHS[m - 1]} ${y}`, x: xOf(d), w: (diffDays(d, end) + 1) * px.value })
    d = addDays(end, 1)
  }
  return out
})
const tickCells = computed(() => {
  const out: { key: string; label: string; x: number; w: number; weekend: boolean; today: boolean }[] = []
  if (zoom.value === 'day') for (let i = 0; i < days.value; i++) { const d = addDays(range.value.start, i); const dow = new Date(d + 'T00:00:00Z').getUTCDay(); out.push({ key: d, label: String(+d.slice(8, 10)), x: i * px.value, w: px.value, weekend: dow === 0 || dow === 6, today: d === todayIso }) }
  else { const step = zoom.value === 'week' ? 7 : 7; for (let i = 0; i < days.value; i += step) { const d = addDays(range.value.start, i); if (zoom.value === 'month' && +d.slice(8, 10) > 7 && i > 0) continue; out.push({ key: d, label: zoom.value === 'week' ? `KW ${isoWeek(d)}` : '', x: i * px.value, w: step * px.value, weekend: false, today: todayIso >= d && todayIso < addDays(d, 7) }) } }
  return out
})
function isoWeek(iso: string) { const d = new Date(iso + 'T00:00:00Z'); const dayNum = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dayNum + 3); const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return 1 + Math.round(((d.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7) }
const weekendStripes = computed(() => (zoom.value !== 'day' ? [] : tickCells.value.filter(c => c.weekend).map(c => ({ x: c.x, w: c.w }))))

const rows = computed(() => sorted.value.map(t => ({ t, x: xOf(t.startDate), w: (t.milestone ? 0 : diffDays(t.startDate, t.endDate) + 1) * px.value })))
const rowIndex = computed(() => new Map(rows.value.map((r, i) => [r.t.taskId, i])))

// ── Pfeile ──
const arrows = computed(() => {
  const out: { key: string; d: string; critical: boolean; from: string; to: string }[] = []
  for (const r of rows.value) for (const pid of r.t.predecessors || []) {
    const pi = rowIndex.value.get(pid); if (pi === undefined) continue
    const p = rows.value[pi], ti = rowIndex.value.get(r.t.taskId)!
    const x1 = p.t.milestone ? p.x + px.value / 2 + 9 : p.x + p.w, y1 = pi * ROW + ROW / 2
    const x2 = r.t.milestone ? r.x + px.value / 2 - 9 : r.x, y2 = ti * ROW + ROW / 2
    const mid = Math.max(x1 + 8, Math.min(x2 - 8, x1 + 12))
    const d = x2 >= x1 + 14 ? `M${x1},${y1} H${mid} V${y2} H${x2}` : `M${x1},${y1} H${x1 + 8} V${(y1 + y2) / 2} H${x2 - 8} V${y2} H${x2}`
    out.push({ key: `${pid}>${r.t.taskId}`, d, critical: showCritical.value && crit.value.criticalIds.has(pid) && crit.value.criticalIds.has(r.t.taskId), from: pid, to: r.t.taskId })
  }
  return out
})
const tip = (t: GanttTask) => `${t.title} · ${dateDe(t.startDate)}${t.milestone ? '' : ' – ' + dateDe(t.endDate) + ' (' + duration(t) + ' Tage)'} · ${t.progress ?? 0} %${t.assignee ? ' · ' + t.assignee : ''}${crit.value.criticalIds.has(t.taskId) ? ' · kritisch' : ''}`

// ── Maus ──
let cleanup: (() => void) | null = null
function startDrag(ev: PointerEvent, t: GanttTask, mode: Drag['mode']) {
  if (ev.button !== 0) return
  ev.preventDefault()
  const original = base.value.find(x => x.taskId === t.taskId)!
  const barEl = (ev.currentTarget as HTMLElement).closest('.bar') as HTMLElement | null
  const barW = barEl ? barEl.getBoundingClientRect().width : 0, barLeft = barEl ? barEl.getBoundingClientRect().left : 0
  drag.value = { taskId: t.taskId, mode, x0: ev.clientX, delta: 0, moved: false, progress: original.progress }
  selected.value = t.taskId
  const onMove = (e: PointerEvent) => {
    const d = drag.value; if (!d) return
    const dx = e.clientX - d.x0
    if (!d.moved && Math.abs(dx) < 3) return
    d.moved = true
    if (mode === 'progress') d.progress = clampProgress(((e.clientX - barLeft) / Math.max(1, barW)) * 100)
    else d.delta = Math.round(dx / px.value)
    const rect = timeline.value?.getBoundingClientRect(); if (rect) { dragTip.x = e.clientX - rect.left + 12; dragTip.y = e.clientY - rect.top - 28 }
    drag.value = { ...d }
  }
  const onUp = () => {
    const d = drag.value; cleanup?.()
    const changes = d && d.moved ? diffChanges(d) : []         // zuerst rechnen, solange die Vorschau noch gilt
    drag.value = null
    if (changes.length) emit('change', changes)
  }
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp, { once: true })
  cleanup = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); cleanup = null }
}
/** Änderungen gegenüber dem gespeicherten Stand, die für die Vorschau gelten (der gezogene Vorgang; Nachfolger rechnet der Server nach) */
function diffChanges(d: Drag): ScheduleChange[] {
  const before = base.value.find(x => x.taskId === d.taskId)!, after = view.value.find(x => x.taskId === d.taskId)!
  if (d.mode === 'progress') return after.progress !== before.progress ? [{ taskId: d.taskId, progress: after.progress }] : []
  return after.startDate !== before.startDate || after.endDate !== before.endDate ? [{ taskId: d.taskId, startDate: after.startDate, endDate: after.endDate }] : []
}
const dragLabel = computed(() => { const d = drag.value; if (!d?.moved) return ''; const t = view.value.find(x => x.taskId === d.taskId); if (!t) return ''; return d.mode === 'progress' ? `${t.progress} %` : `${dateDe(t.startDate)}${t.milestone ? '' : ' – ' + dateDe(t.endDate)}` })

function startLink(ev: PointerEvent, from: GanttTask) {
  if (ev.button !== 0) return
  ev.preventDefault()
  const rect = timeline.value!.getBoundingClientRect()
  const i = rowIndex.value.get(from.taskId)!, r = rows.value[i]
  const x0 = (from.milestone ? r.x + px.value / 2 + 9 : r.x + r.w) + 8, y0 = i * ROW + ROW / 2
  link.value = { fromId: from.taskId, x0, y0, x1: x0, y1: y0 }
  const onMove = (e: PointerEvent) => { if (link.value) link.value = { ...link.value, x1: e.clientX - rect.left, y1: e.clientY - rect.top } }
  const onUp = (e: PointerEvent) => {
    cleanup?.(); const l = link.value; link.value = null
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-task]') as HTMLElement | null
    const targetId = el?.dataset.task
    if (!l || !targetId || targetId === l.fromId) return
    const target = base.value.find(x => x.taskId === targetId)!
    if ((target.predecessors || []).includes(l.fromId)) return
    if (wouldCycle(base.value, targetId, l.fromId)) { emit('error', 'Diese Verknüpfung ergäbe einen Kreis (A hinge am Ende wieder von A ab).'); return }
    emit('change', [{ taskId: targetId, predecessors: [...(target.predecessors || []), l.fromId] }])
  }
  window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp, { once: true })
  cleanup = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); cleanup = null }
}
function removeDep(a: { from: string; to: string }) {
  if (!window.confirm('Diese Abhängigkeit entfernen?')) return
  const t = base.value.find(x => x.taskId === a.to)!
  emit('change', [{ taskId: a.to, predecessors: (t.predecessors || []).filter(p => p !== a.from) }])
}
function toggleDone(t: GanttTask, done: boolean) { emit('change', [{ taskId: t.taskId, progress: done ? 100 : 0 }]) }
function scrollToToday() { const el = scroller.value; if (el && todayX.value !== null) el.scrollTo({ left: Math.max(0, todayX.value - 200), behavior: 'smooth' }) }
onMounted(() => { setTimeout(scrollToToday, 50) })
onBeforeUnmount(() => cleanup?.())
</script>

<style scoped>
.gt { display: flex; flex-direction: column; gap: 8px }
.gt-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap }
.seg { display: inline-flex; border: 0.5px solid var(--border); border-radius: 10px; overflow: hidden }
.seg button { border: none; background: var(--bg-surface); padding: 6px 12px; font-size: 12px; cursor: pointer; color: var(--text) } .seg button.on { background: var(--accent); color: #fff }
.chk { font-size: 12px; display: inline-flex; gap: 6px; align-items: center; cursor: pointer }
.mini { border: 0.5px solid var(--border); background: var(--bg-surface); border-radius: 8px; padding: 6px 10px; font-size: 12px; cursor: pointer; color: var(--text); display: inline-flex; gap: 5px; align-items: center }
.prog { font-size: 12px; font-weight: 700; color: var(--accent) }
.empty { padding: 36px; text-align: center; color: var(--text-muted); border: 1px dashed var(--border); border-radius: 12px }
.gt-scroll { overflow: auto; max-height: 70vh; border: 0.5px solid var(--border); border-radius: 12px; background: var(--bg-surface); position: relative }
.gt-grid { display: grid; width: max-content; user-select: none }
.gt-hl, .gt-hr { position: sticky; top: 0; height: 52px; background: var(--bg-surface); border-bottom: 0.5px solid var(--border); z-index: 4 }
.gt-hl { left: 0; z-index: 6; display: flex; align-items: flex-end; border-right: 0.5px solid var(--border) } .gt-hr { position: sticky }
.gt-left { position: sticky; left: 0; z-index: 3; background: var(--bg-surface); border-right: 0.5px solid var(--border) }
.c { padding: 0 8px; font-size: 12px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; box-sizing: border-box }
.c.t { width: 220px; display: flex; align-items: center; gap: 6px } .c.a { width: 110px } .c.d { width: 74px } .c.n { width: 46px; text-align: right }
.gt-hl .c { font-size: 11px; font-weight: 700; color: var(--text-muted); padding-bottom: 6px }
.tt { overflow: hidden; text-overflow: ellipsis }
.lrow { display: flex; align-items: center; border-bottom: 0.5px solid var(--border); cursor: default } .lrow.sel { background: rgba(108, 63, 232, .08) }
.mrow, .drow { position: relative; height: 26px } .mc { position: absolute; top: 0; height: 26px; line-height: 26px; padding-left: 8px; font-size: 11px; font-weight: 700; border-left: 0.5px solid var(--border); box-sizing: border-box; white-space: nowrap; overflow: hidden }
.dc { position: absolute; top: 0; height: 26px; line-height: 26px; text-align: center; font-size: 10px; color: var(--text-muted); border-left: 0.5px solid var(--border); box-sizing: border-box } .dc.we { background: #00000008 } .dc.today { color: var(--accent); font-weight: 800 }
.gt-right { position: relative; overflow: hidden }
.wk { position: absolute; top: 0; bottom: 0; background: #0000000a } .hl { position: absolute; left: 0; right: 0; border-bottom: 0.5px solid var(--border) } .hl.sel { background: rgba(108, 63, 232, .06) }
.todayline { position: absolute; top: 0; bottom: 0; width: 2px; background: #E05C5C; opacity: .7; z-index: 1; pointer-events: none }
.arrows { position: absolute; left: 0; top: 0; z-index: 2; pointer-events: none }
.arrows g { pointer-events: stroke } .arrows .hit { fill: none; stroke: transparent; stroke-width: 10; cursor: pointer } .arrows .ar { fill: none; stroke: #8a93a6; stroke-width: 1.5 } .arrows g.crit .ar { stroke: #E05C5C; stroke-width: 2 } .arrows g:hover .ar { stroke: var(--accent) }
.linkdrag { stroke: var(--accent); stroke-width: 2; stroke-dasharray: 4 3; fill: none }
.barwrap { position: absolute; left: 0; right: 0; z-index: 3; pointer-events: none }
.bar { position: absolute; top: 7px; height: 20px; border-radius: 5px; background: #6C3FE8; opacity: .95; pointer-events: auto; cursor: grab; box-sizing: border-box; overflow: visible; color: #fff; font-size: 11px; display: flex; align-items: center }
.bar.crit { background: #E05C5C } .bar.done { background: #00A844 } .bar.dragging { cursor: grabbing; box-shadow: 0 4px 14px rgba(0,0,0,.3); opacity: 1 }
.fill { position: absolute; left: 0; top: 0; bottom: 0; background: rgba(0, 0, 0, .28); border-radius: 5px 0 0 5px; pointer-events: none }
.bl { position: relative; padding: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none }
.outlabel, .mslabel { position: absolute; top: 9px; font-size: 11px; color: var(--text); white-space: nowrap; pointer-events: none }
.h { position: absolute; top: 0; bottom: 0; width: 7px; cursor: ew-resize; z-index: 2 } .hl2 { left: 0 } .hr2 { right: 0 }
.ph { position: absolute; bottom: -4px; width: 0; height: 0; margin-left: -5px; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 7px solid #231c2c; cursor: ew-resize; opacity: 0 } .bar:hover .ph, .bar.dragging .ph { opacity: .9 }
.dot { position: absolute; top: 13px; width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid var(--accent); background: var(--bg-surface); pointer-events: auto; cursor: crosshair; opacity: 0 } .barwrap:hover .dot { opacity: 1 }
.ms { position: absolute; top: 8px; width: 18px; height: 18px; transform: rotate(45deg) scale(.78); background: #6C3FE8; pointer-events: auto; cursor: grab; border-radius: 3px } .ms.crit { background: #E05C5C } .ms.done { background: #00A844 }
.dragtip { position: absolute; z-index: 9; background: #231c2c; color: #fff; font-size: 11px; padding: 3px 8px; border-radius: 6px; pointer-events: none; white-space: nowrap }
.legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11px; color: var(--text-muted) } .sw { display: inline-block; width: 11px; height: 11px; border-radius: 3px; vertical-align: -1px; margin-right: 4px } .sw.n { background: #6C3FE8 } .sw.c { background: #E05C5C } .sw.dn { background: #00A844 }
</style>
