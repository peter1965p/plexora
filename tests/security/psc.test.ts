import { describe, it, expect, vi, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { pct, loadLevel, errorLevel, recoveryLevel, backupLevel, ageText, adviceFrom, mb, kb } from '../../shared/psc'

describe('PSC Manager: Ampeln und Zahlen', () => {
  it('Auslastung: unter 60 % ok, bis 85 % Warnung, darüber kritisch; Grenzwerte und Null', () => {
    expect(pct(3, 300)).toBe(1); expect(pct(400, 300)).toBe(100); expect(pct(5, 0)).toBe(0); expect(pct(-5, 10)).toBe(0)
    expect(loadLevel(10, 100)).toBe('ok'); expect(loadLevel(70, 100)).toBe('warn'); expect(loadLevel(90, 100)).toBe('bad'); expect(loadLevel(0, 0)).toBe('ok')
  })
  it('Fehlerquote: Drosselungen zählen mit; ohne Anfragen kein Alarm', () => {
    expect(errorLevel(0, 0, 0)).toBe('ok'); expect(errorLevel(0, 0, 1000)).toBe('ok'); expect(errorLevel(5, 5, 1000)).toBe('ok'); expect(errorLevel(20, 10, 1000)).toBe('warn'); expect(errorLevel(0, 600, 1000)).toBe('bad')
  })
  it('Wiederherstellung und Sicherung', () => {
    expect(recoveryLevel(0, 84)).toBe('bad'); expect(recoveryLevel(10, 84)).toBe('warn'); expect(recoveryLevel(84, 84)).toBe('ok'); expect(recoveryLevel(0, 0)).toBe('off')
    const now = Date.parse('2026-10-22T12:00:00Z')
    expect(backupLevel(undefined, now)).toBe('bad'); expect(backupLevel('2026-10-22T06:00:00Z', now)).toBe('ok'); expect(backupLevel('2026-10-17T12:00:00Z', now)).toBe('warn'); expect(backupLevel('2026-09-01T00:00:00Z', now)).toBe('bad')
  })
  it('Alter und Größen', () => {
    const now = Date.parse('2026-10-22T12:00:00Z')
    expect(ageText('2026-10-22T11:59:30Z', now)).toBe('gerade eben'); expect(ageText('2026-10-22T11:30:00Z', now)).toBe('vor 30 Minuten'); expect(ageText('2026-10-22T06:00:00Z', now)).toBe('vor 6 Stunden'); expect(ageText('2026-10-19T12:00:00Z', now)).toBe('vor 3 Tagen')
    expect(ageText('', now)).toBe('—'); expect(ageText('kaputt', now)).toBe('—'); expect(mb(2097152)).toBe(2); expect(kb(2048)).toBe(2)
  })
})

describe('PSC Manager: Hinweise', () => {
  const ok = <T>(data: T) => ({ ok: true as const, data })
  const base = () => ({ db: ok({ tables: 84, pitrEnabled: 0, deletionProtected: 0 }), lambda: ok({ throttles24h: 0, errors24h: 0, invocations24h: 100 }), protection: ok({ roles: false, plan: false, auth: false }), backups: ok({ last: null, external: false }) })
  it('heutiger Stand: Wiederherstellung fehlt (kritisch), keine Sicherung, keine Kopie außerhalb, Rollen/Tarif nur beobachtet', () => {
    const a = adviceFrom(base()), t = a.map(x => x.text).join(' | ')
    expect(a[0].level).toBe('bad'); expect(t).toContain('keine der 84 Tabellen'); expect(t).toContain('keine fertige Gesamtsicherung'); expect(t).toContain('außerhalb von AWS'); expect(t).toContain('Rollenprüfung'); expect(t).toContain('Tarifprüfung'); expect(t).toContain('Löschschutz')
    for (let i = 1; i < a.length; i++) expect(['bad', 'warn', 'ok', 'off'].indexOf(a[i].level)).toBeGreaterThanOrEqual(['bad', 'warn', 'ok', 'off'].indexOf(a[i - 1].level))       // kritisch zuerst
  })
  it('alles gut: keine Hinweise; Drosselungen und Fehler erscheinen; ausgefallene Abschnitte erzeugen keine Hinweise', () => {
    const good = { db: ok({ tables: 84, pitrEnabled: 84, deletionProtected: 84 }), lambda: ok({ throttles24h: 0, errors24h: 0, invocations24h: 100 }), protection: ok({ roles: true, plan: true, auth: true }), backups: ok({ last: { at: new Date().toISOString() }, external: true }) }
    expect(adviceFrom(good)).toEqual([])
    expect(adviceFrom({ ...good, lambda: ok({ throttles24h: 5, errors24h: 2, invocations24h: 100 }) }).map(x => x.text).join()).toMatch(/5 Anfragen.*gedrosselt[\s\S]*2 Funktionsfehler/)
    expect(adviceFrom({ db: { ok: false, error: 'AccessDenied' }, lambda: { ok: false, error: 'x' } })).toEqual([]); expect(adviceFrom(null)).toEqual([])
  })
})

// ── Route: nur Betreiber, Abschnitte fallen einzeln aus, kein Rückfall ──
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('getQuery', (e: any) => e.query || {})
vi.stubGlobal('useRuntimeConfig', () => ({ rolesEnforce: '', planEnforce: '', authEnforce: '', welcomeLink: 'true' }))
vi.mock('../../server/utils/pscOverview', async () => {
  const s = await vi.importActual<any>('../../server/utils/pscOverview')
  return { ...s,
    lambdaSection: async () => ({ accountLimit: 1000, unreserved: 700, reserved: 300, memoryMb: 1536, runtime: 'nodejs22.x', timeoutS: 300, lastModified: '', version: '53', concurrentNow: 2, invocations24h: 1000, throttles24h: 0, errors24h: 0, avgMs: 60, metricsOk: true }),
    dbSection: async () => { throw Object.assign(new Error('x'), { name: 'AccessDeniedException' }) },
    demoSection: async () => ({ poolSize: 10, leased: 1, dirty: 0, lastReset: '' }),
    backupSection: async () => ({ recent: 0, last: null, lastAny: null, external: false }),
    runtimeSection: () => ({ node: 'v22', region: 'eu-central-1', uptimeS: 5, rssMb: 100, heapMb: 50, memoryLimitMb: 1536, functionVersion: '53' }),
    protectionSection: () => ({ roles: false, plan: false, auth: false, welcomeLink: true }) }
})
let H: any
beforeAll(async () => { H = (await import('../../server/api/admin/psc/overview.get')).default })
const ev = (groups: string[] | null, email = 'peter@x.de') => ({ context: { auth: groups ? { userId: 'u', email, groups } : undefined }, query: {} })
const call = async (e: any) => { try { return { code: 200, res: await H(e) } } catch (x: any) { return { code: x.statusCode as number } } }
describe('PSC Manager: Route', () => {
  it('nur Plattform-Betreiber: anonym 401, Kunde 403, Demo 403', async () => {
    expect((await call(ev(null))).code).toBe(401); expect((await call(ev(['customers']))).code).toBe(403); expect((await call(ev(['customers'], 'demo@plexora.eu'))).code).toBe(403); expect((await call(ev(['customers'], 'demo05@plexora.eu'))).code).toBe(403)
  })
  it('Betreiber: ein ausgefallener Abschnitt (DB) stört die anderen nicht und nennt nur den Fehlernamen', async () => {
    const r = await call(ev(['admins'])); expect(r.code).toBe(200)
    expect(r.res.lambda).toMatchObject({ ok: true }); expect(r.res.db).toEqual({ ok: false, error: 'AccessDenied' }); expect(r.res.demo.ok).toBe(true); expect(r.res.backups.ok).toBe(true); expect(r.res.protection.data.roles).toBe(false); expect(r.res.runtime.ok).toBe(true)
    expect(JSON.stringify(r.res)).not.toMatch(/AKIA|secret|password|token/i)
  })
})

describe('PSC Manager: Einbau', () => {
  it('Reiter Infrastruktur und Datenintegrität sind aus den Einstellungen in das PSC Manager umgezogen', () => {
    const st = readFileSync('app/pages/settings/index.vue', 'utf8'), psc = readFileSync('app/pages/psc/index.vue', 'utf8')
    expect(st).not.toContain("tab === 'infra'"); expect(st).not.toContain("tab === 'integrity' && isAdmin"); expect(st).not.toContain('loadIntegrityScan'); expect(st).toContain("navigateTo('/psc?tab='")
    expect(psc).toContain('<PscInfra'); expect(psc).toContain('<PscIntegrity'); expect(readFileSync('app/components/PscInfra.vue', 'utf8')).toContain('loadAws'); expect(readFileSync('app/components/PscIntegrity.vue', 'utf8')).toContain('loadIntegrityScan')
  })
  it('Seitenleiste zeigt PSC Manager nur Betreibern', () => { const sb = readFileSync('app/components/AppSidebar.vue', 'utf8'); expect(sb).toContain("isPlatformAdmin.value ? [{ to: '/psc'") })
})

import { hourBuckets } from '../../shared/psc'
describe('PSC Manager: Stundenverlauf und anklickbare Hinweise', () => {
  const end = Date.parse('2026-10-22T12:00:00Z')
  it('Messpunkte landen im richtigen Stunden-Eimer; außerhalb, ungültig und fehlend zählt nicht', () => {
    const b = hourBuckets([{ ts: '2026-10-22T11:10:00Z', v: 5 }, { ts: '2026-10-22T11:50:00Z', v: 7 }, { ts: '2026-10-21T12:00:00Z', v: 3 }, { ts: '2026-10-21T11:59:00Z', v: 99 }, { ts: '2026-10-22T12:00:00Z', v: 99 }, { ts: 'kaputt', v: 1 }, { ts: end - 3_600_000 * 5 - 1000, v: 2.6 }], end)
    expect(b.length).toBe(24); expect(b[23]).toBe(12); expect(b[0]).toBe(3); expect(b[18]).toBe(3); expect(b.reduce((s, v) => s + v, 0)).toBe(18)
    expect(hourBuckets([], end, 3)).toEqual([0, 0, 0])
  })
  it('Hinweise führen zu einem Ziel: Sicherungsthemen zum Reiter Notfall, Drosselung zur Infrastruktur, Rollen zur Hilfe', () => {
    const ok = <T>(data: T) => ({ ok: true as const, data })
    const a = adviceFrom({ db: ok({ tables: 84, pitrEnabled: 0, deletionProtected: 0 }), lambda: ok({ throttles24h: 3, errors24h: 1, invocations24h: 100 }), protection: ok({ roles: false, plan: false }), backups: ok({ last: null, external: false }) })
    const to = (re: RegExp) => a.find(x => re.test(x.text))?.to
    expect(to(/keine der 84/)).toBe('tab:notfall'); expect(to(/Gesamtsicherung/)).toBe('tab:notfall'); expect(to(/Löschschutz/)).toBe('tab:notfall'); expect(to(/außerhalb von AWS/)).toBe('tab:notfall')
    expect(to(/gedrosselt/)).toBe('tab:infra'); expect(to(/Funktionsfehler/)).toBe('tab:infra'); expect(to(/Rollenprüfung/)).toBe('/help?topic=rollen')
    expect(a.every(x => !x.to || /^(tab:(notfall|infra|integrity|overview)|\/[a-z])/.test(x.to))).toBe(true)
  })
  it('Seite: Balken in allen vier Spalten, Verlaufsgrafik, Ampel-Linien und klickbare Hinweise', () => {
    const p = readFileSync('app/pages/psc/index.vue', 'utf8')
    expect((p.match(/class="psc-bar"/g) || []).length).toBe(5);       // vier Spalten der Übersicht plus Fortschritt im Reiter Notfall
    expect(readFileSync('app/components/PscInfra.vue', 'utf8')).toContain('psc-top'); expect(readFileSync('app/components/PscIntegrity.vue', 'utf8')).toContain('psc-top'); expect(p).toContain("{{ STEPS.length }} {{ tr('Schritten fertig') }}"); expect(p).toContain('psc-spark'); expect(p).toContain('borderTopColor'); expect(p).toContain('@click="go(a.to)"')
  })
})

import { weekBuckets as _wb, sparkPoints as _sp } from '../../shared/psc'
describe('Verlaufslinien (Dashboard)', () => {
  const end = Date.UTC(2026, 9, 22)
  it('zählt neue Einträge je Woche, ignoriert Ungültiges', () => {
    const items = [{ c: end - 1000 }, { c: end - 8 * 86_400_000 }, { c: 'x' }, { c: end - 99 * 86_400_000 }, {}]
    const b = _wb(items, 'c', end, 8)
    expect(b).toHaveLength(8)
    expect(b[7]).toBe(1)
    expect(b[6]).toBe(1)
    expect(b.reduce((a, c) => a + c, 0)).toBe(2)
  })
  it('liefert keine Linie ohne Daten', () => {
    expect(_sp([0, 0, 0])).toBe('')
    expect(_sp([])).toBe('')
    expect(_sp([1, 3, 2]).split(' ')).toHaveLength(3)
  })
})
