import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { KIT_PACKAGES, KIT_MAX_RECORDS, KitError, kitPackage, kitEntity, sanitizeRecord, kitSum, kitSortKey } from '../../shared/branchKit'
import { findModuleRule, describeNeed } from '../../server/utils/moduleAccess'
import { ROLE_RULES } from '../../server/utils/rolePolicy'

describe('Baukasten: Beschreibung', () => {
  it('sechs Pakete, eindeutige Schlüssel, Icons und Preise', () => {
    expect(KIT_PACKAGES.map(p => p.key)).toEqual(['fitness', 'bildung', 'events', 'reinigung', 'vereine', 'taxi'])
    for (const p of KIT_PACKAGES) { expect(p.price, p.key).toBeGreaterThan(0); expect(p.features.length).toBeGreaterThan(1); expect(p.steps.length).toBeGreaterThan(1) }
  })
  it('jede Liste ist in sich stimmig: Felder eindeutig, Tabellen-/Titel-/Summenfelder und Verweise existieren', () => {
    for (const p of KIT_PACKAGES) for (const e of p.entities) {
      const keys = e.fields.map(f => f.key)
      expect(new Set(keys).size, `${p.key}/${e.key}`).toBe(keys.length)
      for (const k of [...e.list, e.title, ...(e.sum ? [e.sum] : []), ...(e.sumWhere ? [e.sumWhere[0]] : [])]) expect(keys, `${p.key}/${e.key}: ${k}`).toContain(k)
      if (e.sumWhere) expect(e.fields.find(f => f.key === e.sumWhere![0])!.options, `${p.key}/${e.key}`).toContain(e.sumWhere[1])
      for (const f of e.fields) {
        if (f.type === 'select') expect(f.options?.length, `${p.key}/${e.key}/${f.key}`).toBeGreaterThan(0)
        if (f.type === 'ref') expect(kitEntity(p, f.ref), `${p.key}/${e.key}/${f.key}`).toBeTruthy()
      }
    }
  })
  it('keine Gesundheits- oder Zahlungsdaten-Felder', () => {
    const all = JSON.stringify(KIT_PACKAGES).toLowerCase()
    for (const w of ['diagnose', 'patient', 'rezept', 'medikament', 'iban', 'kreditkarte', 'versicherung']) expect(all, w).not.toContain(w)
  })
})

describe('Baukasten: Eingaben prüfen', () => {
  const mitglied = kitEntity(kitPackage('fitness'), 'mitglieder')!
  it('nimmt nur bekannte Felder, bereinigt und prüft Pflichtfelder', () => {
    const r = sanitizeRecord(mitglied, { name: '  Anna  ', status: 'aktiv', email: 'a@b.de', evil: '<x>', beginn: '2026-10-01' })
    expect(r).toEqual({ name: 'Anna', status: 'aktiv', email: 'a@b.de', beginn: '2026-10-01' })
    expect(() => sanitizeRecord(mitglied, { status: 'aktiv' })).toThrow(KitError)
    expect(() => sanitizeRecord(mitglied, { name: 'A' })).toThrow(/Status/)
  })
  it('lehnt ungültige Werte ab', () => {
    const bad = (o: any) => expect(() => sanitizeRecord(mitglied, { name: 'A', status: 'aktiv', ...o })).toThrow(KitError)
    bad({ status: 'unbekannt' }); bad({ email: 'keine-mail' }); bad({ telefon: 'abc' }); bad({ beginn: '2026-13-40' })
  })
  it('Geld und Zahlen: Komma erlaubt, nicht negativ (Geld), keine Unendlichkeit', () => {
    const b = kitEntity(kitPackage('fitness'), 'beitraege')!
    expect(sanitizeRecord(b, { mitglied: 'm-1', monat: '2026-11', betrag: '29,90', status: 'offen' }).betrag).toBe(29.9)
    expect(() => sanitizeRecord(b, { mitglied: 'm-1', monat: 'x', betrag: -1, status: 'offen' })).toThrow(/negativ/)
    expect(() => sanitizeRecord(b, { mitglied: 'm-1', monat: 'x', betrag: 'abc', status: 'offen' })).toThrow(KitError)
    expect(() => sanitizeRecord(b, { mitglied: 'm-1', monat: 'x', betrag: 1e12, status: 'offen' })).toThrow(KitError)
    expect(() => sanitizeRecord(b, { mitglied: '../x', monat: 'x', betrag: 1, status: 'offen' })).toThrow(KitError)
  })
  it('Uhrzeit und Länge', () => {
    const k = kitEntity(kitPackage('fitness'), 'kurse')!
    expect(sanitizeRecord(k, { titel: 'Yoga', uhrzeit: '18:30' }).uhrzeit).toBe('18:30')
    expect(() => sanitizeRecord(k, { titel: 'Yoga', uhrzeit: '25:00' })).toThrow(KitError)
    expect(String(sanitizeRecord(k, { titel: 'x'.repeat(500) }).titel).length).toBe(200)
  })
  it('Summe: nur Einträge mit dem gesuchten Stand', () => {
    const b = kitEntity(kitPackage('fitness'), 'beitraege')!
    expect(kitSum(b, [{ betrag: 10, status: 'offen' }, { betrag: 5.5, status: 'offen' }, { betrag: 99, status: 'bezahlt' }])).toBe(15.5)
    expect(kitSum(kitEntity(kitPackage('fitness'), 'kurse')!, [])).toBeNull()
  })
})

describe('Baukasten: Richtlinien', () => {
  it('Paketzugriff je Paket, Rolle Admin', () => {
    for (const p of KIT_PACKAGES) {
      const r = findModuleRule(`/api/branchen/${p.key}/x`, 'GET')
      expect(r && 'need' in r && (r.need as any).branch, p.key).toBe(p.key)
    }
    expect(describeNeed(findModuleRule('/api/branchen/fitnessx/x', 'GET')!.need)).toBe('paid')      // unbekanntes Paket: nicht frei
    expect(ROLE_RULES.find(r => r.prefix === '/api/branchen')?.role).toBe('admin')
  })
  it('Tabelle ist in der Sicherung eingeordnet, Provisionierung kennt alle Pakete', () => {
    expect(JSON.parse(readFileSync('shared/backupConfig.json', 'utf8')).tables['plexora-branch-records']).toEqual({ mode: 'ownerTenant', attr: 'tenantId' })
    const prov = readFileSync('server/utils/moduleProvisioner.ts', 'utf8')
    expect(prov).toContain('KIT_PACKAGES.map(p => p.key)')
  })
})

// ── Routen mit Fake-DynamoDB ──
const rows = new Map<string, any>()
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input
  if (c === 'ScanCommand') { const e = i.ExpressionAttributeValues[':e']; return { Items: e === 'chef@a.de' ? [{ tenantId: 'T-A' }] : e === 'chef@b.de' ? [{ tenantId: 'T-B' }] : [] } }
  if (c === 'PutCommand') { rows.set(`${i.Item.tenantId}|${i.Item.sk}`, structuredClone(i.Item)); return {} }
  if (c === 'GetCommand') return { Item: rows.get(`${i.Key.tenantId}|${i.Key.sk}`) }
  if (c === 'DeleteCommand') { rows.delete(`${i.Key.tenantId}|${i.Key.sk}`); return {} }
  if (c === 'QueryCommand') return { Items: [...rows.values()].filter(x => x.tenantId === i.ExpressionAttributeValues[':t'] && x.sk.startsWith(i.ExpressionAttributeValues[':p'])) }
  return {}
} }) }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
const H: Record<string, any> = {}
beforeAll(async () => {
  const B = '../../server/api/branchen/[pkg]/[entity]/'
  H.get = (await import(`${B}index.get`)).default; H.post = (await import(`${B}index.post`)).default
  H.put = (await import(`${B}[id].put`)).default; H.del = (await import(`${B}[id].delete`)).default
})
beforeEach(() => rows.clear())
const ev = (email: string | null, params: any, body?: any, groups: string[] = ['customers']) => ({ context: { auth: email ? { userId: 'u', email, groups } : undefined }, params, body })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number, msg: x.message } } }
const P = (entity = 'mitglieder', id?: string) => ({ pkg: 'fitness', entity, ...(id ? { id } : {}) })

describe('Baukasten: Routen', () => {
  it('anlegen, lesen, ändern, löschen; Mandanten sehen nur ihre Einträge', async () => {
    const c = await call(H.post, ev('chef@a.de', P(), { name: 'Anna', status: 'aktiv' }))
    expect(c.code).toBe(200)
    const id = c.res.record.id
    expect((await call(H.get, ev('chef@a.de', P()))).res.records.map((r: any) => r.name)).toEqual(['Anna'])
    expect((await call(H.get, ev('chef@b.de', P()))).res.records).toEqual([])
    expect((await call(H.put, ev('chef@b.de', P('mitglieder', id), { name: 'Hack', status: 'aktiv' }))).code).toBe(404)
    expect((await call(H.put, ev('chef@a.de', P('mitglieder', id), { name: 'Anna B', status: 'pausiert' }))).res.record.status).toBe('pausiert')
    expect((await call(H.del, ev('chef@b.de', P('mitglieder', id)))).code).toBe(200)          // fremder Mandant löscht nur seinen (nicht vorhandenen) Schlüssel
    expect((await call(H.get, ev('chef@a.de', P()))).res.records.length).toBe(1)
    expect((await call(H.del, ev('chef@a.de', P('mitglieder', id)))).code).toBe(200)
    expect((await call(H.get, ev('chef@a.de', P()))).res.records).toEqual([])
  })
  it('anonym 401, Demo-Konto darf nicht schreiben, unbekanntes Paket/Liste 404, ungültige Eingabe 400', async () => {
    expect((await call(H.get, ev(null, P()))).code).toBe(401)
    expect((await call(H.post, ev('demo@plexora.eu', P(), { name: 'x', status: 'aktiv' }, ['demo']))).code).toBe(403)
    expect(rows.size).toBe(0)
    expect((await call(H.get, ev('chef@a.de', { pkg: 'gibtsnicht', entity: 'x' }))).code).toBe(404)
    expect((await call(H.get, ev('chef@a.de', { pkg: 'fitness', entity: 'x' }))).code).toBe(404)
    expect((await call(H.post, ev('chef@a.de', P(), { name: '', status: 'aktiv' }))).code).toBe(400)
    expect((await call(H.put, ev('chef@a.de', P('mitglieder', '../etc')))).code).toBe(404)
  })
  it('Verweise müssen auf vorhandene Einträge desselben Pakets und Mandanten zeigen', async () => {
    const m = (await call(H.post, ev('chef@a.de', P(), { name: 'Anna', status: 'aktiv' }))).res.record.id
    const body = { mitglied: m, monat: '2026-11', betrag: 30, status: 'offen' }
    expect((await call(H.post, ev('chef@a.de', P('beitraege'), body))).code).toBe(200)
    expect((await call(H.post, ev('chef@b.de', P('beitraege'), body))).code).toBe(400)           // Mitglied gehört Mandant A
    expect((await call(H.post, ev('chef@a.de', P('beitraege'), { ...body, mitglied: 'gibtsnicht' }))).code).toBe(400)
  })
  it('Obergrenze je Liste', async () => {
    for (let n = 0; n < KIT_MAX_RECORDS; n++) rows.set(`T-A|${kitSortKey('fitness', 'mitglieder', 'id' + n)}`, { tenantId: 'T-A', sk: kitSortKey('fitness', 'mitglieder', 'id' + n), data: {} })
    expect((await call(H.post, ev('chef@a.de', P(), { name: 'Zuviel', status: 'aktiv' }))).code).toBe(409)
  })
})

describe('isIsoDate (Gantt und Baukasten)', () => {
  it('unmögliche Daten ergeben false statt eines Fehlers', async () => {
    const { isIsoDate } = await import('../../shared/gantt')
    expect(isIsoDate('2026-13-40')).toBe(false); expect(isIsoDate('2026-02-30')).toBe(false); expect(isIsoDate('9999-99-99')).toBe(false)
    expect(isIsoDate('2026-02-28')).toBe(true); expect(isIsoDate('2028-02-29')).toBe(true); expect(isIsoDate(5)).toBe(false)
  })
})
