import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { parseLandingPackages, selectPackages } from '../../shared/landingTheme'

let rows: any[] = [], shownSetting: any = undefined, fail = false; const saved: any[] = []
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ send: async (cmd: any) => {
  if (fail) throw new Error('down')
  const c = cmd.constructor.name
  if (c === 'ScanCommand') return { Items: rows }
  if (c === 'GetCommand') return { Item: shownSetting === undefined ? undefined : { shown: shownSetting } }
  if (c === 'UpdateCommand') { saved.push(cmd.input.ExpressionAttributeValues[':s']); return {} }
  return {}
} }) }))
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('setResponseHeaders', () => {})
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
const H: Record<string, any> = {}
beforeAll(async () => { H.pub = (await import('../../server/api/public/branch-packages.get')).default; H.get = (await import('../../server/api/settings/landing-packages.get')).default; H.post = (await import('../../server/api/settings/landing-packages.post')).default })
const STORE = [
  { key: 'praxis', name: 'Praxis', icon: 'Stethoscope', price: 79, desc: 'd', features: ['a', 'b', 3, null], builtin: true, route: '/praxis', secret: 'x' },
  { key: 'fewo', name: 'Ferienwohnungen', icon: 'BedDouble', price: '79', desc: 'd', features: [], builtin: true, route: '/fewo' },
  { key: 'plug', name: 'Fremdes Plugin', price: 9, builtin: false, remoteEntryUrl: 'https://x.example/geheim' },
  { key: 'gratis', name: 'Gratis', price: 0, builtin: true },
  { key: 'Böse Key!', name: 'X', price: 5, builtin: true },
]
beforeEach(() => { rows = STORE; shownSetting = undefined; fail = false; saved.length = 0 })
const ev = (groups: string[] | null, body?: any) => ({ context: { auth: groups ? { userId: 'u', email: 'x@y.de', groups } : undefined }, body })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number } } }

describe('Auswahl prüfen und anwenden', () => {
  it('parseLandingPackages: null = alle; sonst nur gültige, eindeutige Schlüssel', () => {
    expect(parseLandingPackages(undefined)).toBeNull(); expect(parseLandingPackages('x')).toBeNull(); expect(parseLandingPackages({})).toBeNull()
    expect(parseLandingPackages(['fewo', 'fewo', 'Böse!', 5, '', 'praxis'])).toEqual(['fewo', 'praxis'])
    expect(parseLandingPackages([])).toEqual([])
    expect(parseLandingPackages(Array.from({ length: 50 }, (_, i) => 'k' + i)).length).toBe(24)
  })
  it('selectPackages: ohne Auswahl alle nach Name; mit Auswahl nur diese in gewählter Reihenfolge; Unbekanntes entfällt', () => {
    const all = [{ key: 'b', name: 'Bär' }, { key: 'a', name: 'Adler' }, { key: 'c', name: 'Chef' }]
    expect(selectPackages(all, null).map(p => p.key)).toEqual(['a', 'b', 'c'])
    expect(selectPackages(all, ['c', 'zzz', 'a']).map(p => p.key)).toEqual(['c', 'a'])
    expect(selectPackages(all, [])).toEqual([])
  })
})

describe('Öffentliche Branchen-Pakete', () => {
  it('nur eingebaute, kostenpflichtige Pakete; nur die erlaubten Felder; ohne Auswahl alle nach Name', async () => {
    const r = await H.pub({})
    expect(r.packages.map((p: any) => p.key)).toEqual(['fewo', 'praxis'])
    expect(Object.keys(r.packages[1]).sort()).toEqual(['desc', 'features', 'icon', 'key', 'name', 'price'])
    expect(r.packages[1].features).toEqual(['a', 'b'])
    expect(r.packages[0].price).toBe(79)
    expect(JSON.stringify(r)).not.toMatch(/geheim|remoteEntryUrl|route|secret/)
  })
  it('mit Auswahl: nur die gewählten, in gewählter Reihenfolge; Pakete, die es nicht (mehr) gibt, entfallen', async () => {
    shownSetting = ['praxis', 'gibtsnicht', 'fewo']
    expect((await H.pub({})).packages.map((p: any) => p.key)).toEqual(['praxis', 'fewo'])
    shownSetting = ['plug', 'gratis']                        // nicht eingebaut bzw. kostenlos: nie öffentlich
    expect((await H.pub({})).packages).toEqual([])
  })
  it('Datenbankfehler wird als "nicht verfügbar" gemeldet (die Startseite zeigt dann ihre festen Einträge, anders als bei bewusst leerer Auswahl)', async () => { fail = true; expect(await H.pub({})).toEqual({ packages: [], unavailable: true }) })
})

describe('Einstellungen: Auswahl', () => {
  it('nur Betreiber: anonym 401, Kunde 403', async () => {
    expect((await call(H.get, ev(null))).code).toBe(401)
    expect((await call(H.get, ev(['customers']))).code).toBe(403)
    expect((await call(H.post, ev(['customers'], { shown: ['fewo'] }))).code).toBe(403)
  })
  it('Betreiber sieht alle Store-Pakete (nur Name, Symbol, Preis) und die gespeicherte Auswahl', async () => {
    shownSetting = ['fewo']
    const r = await H.get(ev(['admins']))
    expect(r.available.map((p: any) => p.key)).toEqual(['fewo', 'praxis'])
    expect(Object.keys(r.available[0]).sort()).toEqual(['icon', 'key', 'name', 'price'])
    expect(r.shown).toEqual(['fewo'])
  })
  it('Speichern bereinigt die Liste; null bedeutet wieder "alle"', async () => {
    expect((await H.post(ev(['admins'], { shown: ['praxis', 'praxis', '<x>', 'fewo'] }))).shown).toEqual(['praxis', 'fewo'])
    expect((await H.post(ev(['admins'], { shown: null }))).shown).toBeNull()
    expect((await H.post(ev(['admins'], undefined))).shown).toBeNull()
    expect(saved).toEqual([['praxis', 'fewo'], null, null])
  })
})
