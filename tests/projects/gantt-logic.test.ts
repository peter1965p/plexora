import { describe, it, expect } from 'vitest'
import { addDays, diffDays, duration, wouldCycle, hasCycle, pushSuccessors, criticalPath, projectProgress, applyScheduleChanges, GanttError, type GanttTask } from '../../shared/gantt'

const t = (id: string, s: string, e: string, extra: Partial<GanttTask> = {}): GanttTask => ({ taskId: id, title: id, startDate: s, endDate: e, ...extra })
const D = (n: number) => addDays('2026-11-01', n - 1)          // Tag 1 = 01.11.2026

describe('Tage und Dauer', () => {
  it('Beginn und Ende zählen mit; Meilenstein hat Dauer 0', () => {
    expect(duration(t('a', D(1), D(1)))).toBe(1); expect(duration(t('a', D(1), D(3)))).toBe(3)
    expect(duration(t('m', D(5), D(5), { milestone: true }))).toBe(0)
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02'); expect(diffDays('2026-10-31', '2026-11-02')).toBe(2)
  })
})

describe('Abhängigkeiten', () => {
  it('Kreise werden erkannt (auch Selbstbezug und Ketten), Gleichlauf nicht', () => {
    const tasks = [t('a', D(1), D(2)), t('b', D(3), D(4), { predecessors: ['a'] }), t('c', D(5), D(6), { predecessors: ['b'] })]
    expect(wouldCycle(tasks, 'a', 'a')).toBe(true)
    expect(wouldCycle(tasks, 'a', 'c')).toBe(true)          // a nach c würde a→b→c→a ergeben
    expect(wouldCycle(tasks, 'c', 'a')).toBe(false)         // c nach a: zusätzlicher, erlaubter Weg
    expect(hasCycle(tasks)).toBe(false)
    expect(hasCycle([t('a', D(1), D(1), { predecessors: ['b'] }), t('b', D(1), D(1), { predecessors: ['a'] })])).toBe(true)
  })
  it('Nachfolger rückt hinter den Vorgänger (Tag danach), nie nach vorn; Kette wandert komplett mit', () => {
    const r = pushSuccessors([t('a', D(1), D(3)), t('b', D(2), D(4), { predecessors: ['a'] }), t('c', D(5), D(5), { predecessors: ['b'] })])
    expect([r[1].startDate, r[1].endDate]).toEqual([D(4), D(6)])            // Dauer 3 bleibt
    expect([r[2].startDate, r[2].endDate]).toEqual([D(7), D(7)])
    const spaced = pushSuccessors([t('a', D(1), D(2)), t('b', D(10), D(11), { predecessors: ['a'] })])
    expect(spaced[1].startDate).toBe(D(10))                                  // Lücke bleibt (kein Vorziehen)
  })
  it('Vorgänger als Meilenstein: Nachfolger darf am selben Tag beginnen', () => {
    const r = pushSuccessors([t('m', D(5), D(5), { milestone: true }), t('b', D(1), D(2), { predecessors: ['m'] })])
    expect(r[1].startDate).toBe(D(5))
  })
  it('mehrere Vorgänger: der späteste bestimmt', () => {
    const r = pushSuccessors([t('a', D(1), D(2)), t('b', D(1), D(6)), t('c', D(1), D(1), { predecessors: ['a', 'b'] })])
    expect(r[2].startDate).toBe(D(7))
  })
})

describe('Kritischer Pfad', () => {
  const plan = [t('a', D(1), D(3)), t('b', D(4), D(6), { predecessors: ['a'] }), t('c', D(7), D(8), { predecessors: ['b'] }),
    t('x', D(4), D(5), { predecessors: ['a'] }), t('y', D(1), D(2))]
  it('längste Kette ist kritisch, Nebenzweige und freie Vorgänge haben Puffer', () => {
    const r = criticalPath(plan)
    expect([...r.criticalIds].sort()).toEqual(['a', 'b', 'c'])
    expect(r.floatDays.get('x')).toBe(3)        // x endet an Tag 5, das Projekt an Tag 8: 3 Tage Puffer
    expect(r.floatDays.get('y')).toBe(6)        // freier Vorgang endet an Tag 2: 6 Tage Puffer
  })
  it('Projektende und erledigte Vorgänge', () => {
    const r = criticalPath(plan.map(x => (x.taskId === 'a' ? { ...x, progress: 100 } : x)))
    expect(r.projectEnd).toBe(D(8)); expect(r.criticalIds.has('a')).toBe(false); expect(r.criticalIds.has('b')).toBe(true)
  })
  it('leerer Plan', () => { expect(criticalPath([]).criticalIds.size).toBe(0) })
})

describe('Fortschritt', () => {
  it('nach Dauer gewichtet; erledigt zählt 100', () => {
    expect(projectProgress([t('a', D(1), D(2), { progress: 50 }), t('b', D(3), D(8), { progress: 0 })])).toBe(13)      // (2*50 + 6*0)/8
    expect(projectProgress([t('a', D(1), D(2), { status: 'done' }), t('b', D(3), D(4))])).toBe(50)
    expect(projectProgress([])).toBe(0)
  })
})

describe('Änderungen prüfen und anwenden', () => {
  const base = [t('a', D(1), D(3), { status: 'todo' }), t('b', D(4), D(6), { predecessors: ['a'], status: 'todo' })]
  it('Verschieben des Vorgängers schiebt den Nachfolger mit; nur Plan-Felder werden geändert', () => {
    const r = applyScheduleChanges(base, [{ taskId: 'a', startDate: D(3), endDate: D(5), title: 'HACK', status: 'x' } as any])
    expect([r[0].startDate, r[0].endDate, r[0].title, r[0].status]).toEqual([D(3), D(5), 'a', 'todo'])
    expect([r[1].startDate, r[1].endDate]).toEqual([D(6), D(8)])
  })
  it('Fortschritt 100 setzt erledigt, danach weniger setzt zurück; Werte werden begrenzt', () => {
    const done = applyScheduleChanges(base, [{ taskId: 'a', progress: 250 }])
    expect(done[0]).toMatchObject({ progress: 100, status: 'done' })
    expect(applyScheduleChanges(done, [{ taskId: 'a', progress: 40 }])[0]).toMatchObject({ progress: 40, status: 'todo' })
    expect(applyScheduleChanges(base, [{ taskId: 'a', progress: -5 }])[0].progress).toBe(0)
  })
  it('Meilenstein: Ende = Beginn', () => {
    const r = applyScheduleChanges(base, [{ taskId: 'a', milestone: true, startDate: D(2), endDate: D(9) }])
    expect(r[0]).toMatchObject({ milestone: true, startDate: D(2), endDate: D(2) })
  })
  it('lehnt ab: Kreis, Selbstbezug, unbekannte IDs, schlechte Daten, Ende vor Beginn, zu viele Vorgänger', () => {
    const bad = (c: any[], re: RegExp) => expect(() => applyScheduleChanges(base, c)).toThrow(re)
    bad([{ taskId: 'a', predecessors: ['b'] }], /Kreis/)
    bad([{ taskId: 'a', predecessors: ['a'] }], /eigener Vorgänger/)
    bad([{ taskId: 'zzz', progress: 1 }], /nicht gefunden/)
    bad([{ taskId: 'a', predecessors: ['zzz'] }], /nicht gefunden/)
    bad([{ taskId: 'a', startDate: '2026-02-30' }], /ungültig/)
    bad([{ taskId: 'a', endDate: '2020-01-01' }], /vor dem Beginn/)
    bad([{ taskId: 'a', predecessors: Array.from({ length: 30 }, (_, i) => 'p' + i) }], /Höchstens/)
    expect(() => applyScheduleChanges(base, [{ taskId: 'a', predecessors: ['b'] }])).toThrow(GanttError)
  })
  it('Zuständiger wird bereinigt und gekürzt; Vorgänger ohne Doppelte', () => {
    const r = applyScheduleChanges(base, [{ taskId: 'a', assignee: '  Anna\u0000 ' + 'x'.repeat(200), predecessors: [] }, { taskId: 'b', predecessors: ['a', 'a'] }])
    expect(r[0].assignee!.length).toBe(80); expect(r[0].assignee).not.toContain('\u0000'); expect(r[1].predecessors).toEqual(['a'])
  })
})
