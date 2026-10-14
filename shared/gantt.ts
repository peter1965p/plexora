// Projektplan (Gantt): reine Planungslogik für Server und Oberfläche. Keine Datenbank, kein Netz.
// Zeitrechnung in Kalendertagen (Wochenenden zählen mit). Abhängigkeit = "Ende-Anfang": ein Nachfolger beginnt frühestens am Tag NACH dem Ende des Vorgängers
// (ein Meilenstein als Vorgänger erlaubt den Beginn am selben Tag).
export interface GanttTask {
  taskId: string; title?: string; startDate: string; endDate: string
  progress?: number; milestone?: boolean; predecessors?: string[]; assignee?: string; status?: string
}
export class GanttError extends Error { constructor(message: string) { super(message) } }

export const isIsoDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s
export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const diffDays = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000)
/** Dauer in Tagen, Beginn und Ende zählen mit (1 Tag = Start gleich Ende); Meilensteine haben Dauer 0 */
export const duration = (t: Pick<GanttTask, 'startDate' | 'endDate' | 'milestone'>) => (t.milestone ? 0 : diffDays(t.startDate, t.endDate) + 1)
export const clampProgress = (v: unknown) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0 }

/** Frühester erlaubter Beginn eines Vorgangs wegen seiner Vorgänger (null = keine Einschränkung) */
export function earliestStart(t: GanttTask, byId: Map<string, GanttTask>): string | null {
  let min: string | null = null
  for (const pid of t.predecessors || []) {
    const p = byId.get(pid); if (!p) continue
    const ok = p.milestone ? p.endDate : addDays(p.endDate, 1)
    if (min === null || ok > min) min = ok
  }
  return min
}

/** Würde ein neuer Vorgänger (predId vor taskId) einen Kreis erzeugen? Auch "A nach A" zählt. */
export function wouldCycle(tasks: GanttTask[], taskId: string, predId: string): boolean {
  if (taskId === predId) return true
  const byId = new Map(tasks.map(t => [t.taskId, t]))
  const seen = new Set<string>()
  const stack = [predId]                    // von predId aus rückwärts: kommt taskId unter den Vorgängern vor?
  while (stack.length) {
    const id = stack.pop()!
    if (id === taskId) return true
    if (seen.has(id)) continue
    seen.add(id)
    for (const p of byId.get(id)?.predecessors || []) stack.push(p)
  }
  return false
}

/** Hat der Plan irgendwo einen Kreis (z. B. aus beschädigten Daten)? */
export function hasCycle(tasks: GanttTask[]): boolean {
  const byId = new Map(tasks.map(t => [t.taskId, t]))
  const state = new Map<string, 1 | 2>()
  const visit = (id: string): boolean => {
    if (state.get(id) === 2) return false
    if (state.get(id) === 1) return true
    state.set(id, 1)
    for (const p of byId.get(id)?.predecessors || []) if (byId.has(p) && visit(p)) return true
    state.set(id, 2); return false
  }
  return tasks.some(t => visit(t.taskId))
}

/** Schiebt Nachfolger nach hinten, wenn ein Vorgänger sie berührt oder überholt (wie die automatische Planung bei MS Project). Nie nach vorn. Gibt neue Objekte zurück. */
export function pushSuccessors(tasks: GanttTask[]): GanttTask[] {
  if (hasCycle(tasks)) throw new GanttError('Die Abhängigkeiten enthalten einen Kreis.')
  const out = tasks.map(t => ({ ...t }))
  const byId = new Map(out.map(t => [t.taskId, t]))
  // topologisch: so oft wiederholen, bis nichts mehr wandert (höchstens Anzahl der Vorgänge)
  for (let round = 0; round <= out.length; round++) {
    let moved = false
    for (const t of out) {
      const min = earliestStart(t, byId)
      if (min !== null && t.startDate < min) {
        const len = t.milestone ? 0 : diffDays(t.startDate, t.endDate)
        t.startDate = min; t.endDate = addDays(min, len); moved = true
      }
    }
    if (!moved) return out
  }
  return out
}

export interface CriticalInfo { criticalIds: Set<string>; floatDays: Map<string, number>; projectEnd: string | null }
/** Kritischer Pfad: Vorgänge ohne Puffer bis zum Projektende. Rückwärtsrechnung vom spätesten Ende; Puffer = spätestes Ende minus aktuelles Ende (in Tagen). */
export function criticalPath(tasks: GanttTask[]): CriticalInfo {
  const open = tasks.filter(t => (t.progress ?? 0) < 100 && t.status !== 'done')
  const all = new Map(tasks.map(t => [t.taskId, t]))
  if (!tasks.length) return { criticalIds: new Set(), floatDays: new Map(), projectEnd: null }
  const projectEnd = tasks.reduce((m, t) => (t.endDate > m ? t.endDate : m), tasks[0].endDate)
  const succ = new Map<string, string[]>()
  for (const t of tasks) for (const p of t.predecessors || []) if (all.has(p)) (succ.get(p) || succ.set(p, []).get(p)!).push(t.taskId)
  const lf = new Map<string, string>()                  // spätestes Ende
  const calc = (id: string, guard = new Set<string>()): string => {
    if (lf.has(id)) return lf.get(id)!
    if (guard.has(id)) return projectEnd
    guard.add(id)
    const t = all.get(id)!
    let latest = projectEnd
    for (const sid of succ.get(id) || []) {
      const s = all.get(sid)!
      const sLatestFinish = calc(sid, guard)
      const sLatestStart = s.milestone ? sLatestFinish : addDays(sLatestFinish, -(duration(s) - 1))
      const mine = t.milestone ? sLatestStart : addDays(sLatestStart, -1)                    // Nachfolger beginnt am Tag nach meinem Ende (Meilenstein: am selben Tag)
      if (mine < latest) latest = mine
    }
    lf.set(id, latest); return latest
  }
  const floatDays = new Map<string, number>(), critical = new Set<string>()
  for (const t of tasks) { const f = diffDays(t.endDate, calc(t.taskId)); floatDays.set(t.taskId, f) }
  for (const t of open) if ((floatDays.get(t.taskId) ?? 1) <= 0) critical.add(t.taskId)
  // Nur Ketten zählen: ein einzelner Vorgang ohne Abhängigkeit ist nur kritisch, wenn er selbst das Projektende bestimmt
  return { criticalIds: critical, floatDays, projectEnd }
}

/** Gesamtfortschritt: nach Dauer gewichtet; Meilensteine zählen mit Gewicht 1 */
export function projectProgress(tasks: GanttTask[]): number {
  let w = 0, sum = 0
  for (const t of tasks) { const wt = Math.max(1, duration(t)); w += wt; sum += wt * (t.status === 'done' ? 100 : clampProgress(t.progress)) }
  return w ? Math.round(sum / w) : 0
}

export interface ScheduleChange { taskId: string; startDate?: string; endDate?: string; progress?: number; milestone?: boolean; predecessors?: string[]; assignee?: string }
const MAX_PRED = 20

/** Prüft Änderungen am Plan und wendet sie auf die vorhandenen Vorgänge an (nur Plan-Felder). Wirft GanttError mit verständlicher Meldung. */
export function applyScheduleChanges(existing: GanttTask[], changes: ScheduleChange[]): GanttTask[] {
  const ids = new Set(existing.map(t => t.taskId))
  const byChange = new Map<string, ScheduleChange>()
  for (const c of changes) {
    if (!c || typeof c.taskId !== 'string' || !ids.has(c.taskId)) throw new GanttError('Ein Vorgang wurde nicht gefunden.')
    byChange.set(c.taskId, c)
  }
  let next = existing.map(t => {
    const c = byChange.get(t.taskId); if (!c) return { ...t }
    const n: GanttTask = { ...t }
    if (c.milestone !== undefined) n.milestone = c.milestone === true
    if (c.startDate !== undefined) { if (!isIsoDate(c.startDate)) throw new GanttError('Das Startdatum ist ungültig.'); n.startDate = c.startDate }
    if (c.endDate !== undefined) { if (!isIsoDate(c.endDate)) throw new GanttError('Das Enddatum ist ungültig.'); n.endDate = c.endDate }
    if (n.milestone) n.endDate = n.startDate
    if (!isIsoDate(n.startDate)) throw new GanttError('Der Vorgang hat kein Startdatum.')
    if (!isIsoDate(n.endDate)) n.endDate = n.startDate
    if (n.endDate < n.startDate) throw new GanttError(`„${t.title || 'Vorgang'}“: Das Ende liegt vor dem Beginn.`)
    if (diffDays(n.startDate, n.endDate) > 3650) throw new GanttError('Ein Vorgang darf höchstens 10 Jahre dauern.')
    if (c.progress !== undefined) { n.progress = clampProgress(c.progress); n.status = n.progress === 100 ? 'done' : (t.status === 'done' ? 'todo' : t.status) }
    if (c.assignee !== undefined) n.assignee = String(c.assignee).replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80)
    if (c.predecessors !== undefined) {
      if (!Array.isArray(c.predecessors) || c.predecessors.length > MAX_PRED) throw new GanttError(`Höchstens ${MAX_PRED} Vorgänger je Vorgang.`)
      const preds = [...new Set(c.predecessors.filter((p): p is string => typeof p === 'string'))]
      if (preds.some(p => !ids.has(p))) throw new GanttError('Ein Vorgänger wurde nicht gefunden.')
      if (preds.includes(t.taskId)) throw new GanttError('Ein Vorgang kann nicht sein eigener Vorgänger sein.')
      n.predecessors = preds
    }
    return n
  })
  if (hasCycle(next)) throw new GanttError('Diese Abhängigkeit würde einen Kreis ergeben.')
  next = pushSuccessors(next)
  return next
}
