import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// ── Fakes: DynamoDB (Put/Get/Query/Scan/Delete/Update mit attribute_not_exists), Namensauflösung, Netz ──
const T = new Map<string, Map<string, any>>()
const tbl = (n: string) => { if (!T.has(n)) T.set(n, new Map()); return T.get(n)! }
const KEYS: Record<string, string[]> = { 'plexora-fewo-units': ['tenantId', 'unitId'], 'plexora-fewo-bookings': ['tenantId', 'bookingId'], 'plexora-finance': ['userId', 'invoiceId'], 'plexora-newsletter-ratelimit': ['throttleKey'] }
const keyOf = (n: string, k: any) => (KEYS[n] || Object.keys(k)).map(a => k[a]).join('|')
class HttpError extends Error { statusCode: number; data: any; constructor(o: any) { super(o.message); this.statusCode = o.statusCode; this.data = o.data } }
const fakeDb = { async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input, t = tbl(i.TableName)
  const fail = () => { const e: any = new Error('c'); e.name = 'ConditionalCheckFailedException'; throw e }
  if (c === 'PutCommand') { const k = keyOf(i.TableName, i.Item); if (i.ConditionExpression?.startsWith('attribute_not_exists') && t.has(k)) fail(); t.set(k, structuredClone(i.Item)); return {} }
  if (c === 'GetCommand') { const r = t.get(keyOf(i.TableName, i.Key)); return { Item: r ? structuredClone(r) : undefined } }
  if (c === 'QueryCommand') return { Items: [...t.values()].filter(x => (x.tenantId ?? x.userId) === i.ExpressionAttributeValues[':t']).map(x => structuredClone(x)) }
  if (c === 'ScanCommand') return { Items: [...t.values()].filter(x => x.unitId === i.ExpressionAttributeValues[':u']).map(x => structuredClone(x)) }
  if (c === 'DeleteCommand') { t.delete(keyOf(i.TableName, i.Key)); return {} }
  if (c === 'UpdateCommand') {
    const k = keyOf(i.TableName, i.Key), cur = t.get(k), v = i.ExpressionAttributeValues || {}
    if (i.TableName === 'plexora-newsletter-ratelimit') { const row = cur || {}; row.count = (row.count || 0) + v[':one']; t.set(k, row); return { Attributes: { ...row } } }
    if (i.ConditionExpression?.startsWith('attribute_not_exists') && cur?.invoiceId !== undefined) fail()
    const row = { ...(cur || {}) }
    for (const a of String(i.UpdateExpression).replace(/^SET /, '').split(',')) { const [l, r] = a.split('=').map(s => s.trim()); row[l] = v[r] }
    t.set(k, row); return { Attributes: { ...row } }
  }
  return {}
} }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDb }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => (e === 'sylvia@firma.de' ? 'chef@firma.de' : e) }))
vi.mock('node:dns/promises', () => ({ lookup: async (h: string) => [{ address: h === 'intern.example' ? '10.0.0.5' : '93.184.216.34' }] }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('getQuery', (e: any) => e.query || {})
vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
vi.stubGlobal('setHeader', (e: any, n: string, v: string) => { (e.out ||= {})[n] = v })
vi.stubGlobal('setResponseHeaders', () => {})
vi.stubGlobal('useRuntimeConfig', () => ({ planEnforce: '', adminEmail: '' }))
vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {})

// Kanal-Kalender: was die "Gegenstelle" gerade ausliefert
const net = { responses: {} as Record<string, { status?: number; body?: string; location?: string }>, calls: [] as string[] }
vi.stubGlobal('fetch', async (url: any) => {
  const u = String(url); net.calls.push(u)
  const r = net.responses[u] ?? { status: 404 }
  const status = r.status ?? 200
  return new Response(status >= 300 && status < 400 ? null : (r.body ?? ''), { status, headers: r.location ? { location: r.location } : {} })
})

const H: Record<string, any> = {}
beforeAll(async () => {
  const load = async (n: string, p: string) => { H[n] = (await import(p)).default }
  await load('units', '../../server/api/fewo/units/index.get'); await load('unitCreate', '../../server/api/fewo/units/index.post')
  await load('unitPut', '../../server/api/fewo/units/[id]/index.put'); await load('unitDel', '../../server/api/fewo/units/[id]/index.delete')
  await load('rotate', '../../server/api/fewo/units/[id]/export-token.post'); await load('feedAdd', '../../server/api/fewo/units/[id]/feeds/index.post')
  await load('feedDel', '../../server/api/fewo/units/[id]/feeds/[feedId].delete'); await load('sync', '../../server/api/fewo/units/[id]/sync.post')
  await load('bookings', '../../server/api/fewo/bookings/index.get'); await load('bookCreate', '../../server/api/fewo/bookings/index.post')
  await load('bookPut', '../../server/api/fewo/bookings/[id]/index.put'); await load('bookDel', '../../server/api/fewo/bookings/[id]/index.delete')
  await load('toInvoice', '../../server/api/fewo/bookings/[id]/to-invoice.post'); await load('ical', '../../server/api/public/fewo/ical/[ref].get')
})
const user = (email: string, groups: string[] = ['customers']) => ({ userId: 's-' + email, email, groups })
const OWNER = user('chef@firma.de'), OTHER = user('fremd@firma.de'), DEMO = user('demo@plexora.eu'), MEMBER = user('sylvia@firma.de')
let ipN = 0
const ev = (auth: any, over: any = {}) => ({ context: { auth }, params: {}, headers: { 'x-forwarded-for': `203.0.113.${++ipN % 250}` }, query: {}, ...over })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number, msg: x.message, data: x.data } } }
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
const mkUnit = async (o: any = {}, who = OWNER) => (await call(H.unitCreate, ev(who, { body: { name: 'Seeblick', nightlyRate: 100, cleaningFee: 50, touristTax: 2, capacity: 4, ...o } }))).res.unit
const book = (unitId: string, o: any = {}, who = OWNER) => call(H.bookCreate, ev(who, { body: { unitId, guestName: 'Anna', guests: 2, checkIn: day(10), checkOut: day(13), ...o } }))
const withId = (id: string, who = OWNER, body?: any, extra: any = {}) => ev(who, { params: { id, ...extra }, body })
const ics = (...evs: Array<[string, string, string]>) => ['BEGIN:VCALENDAR', ...evs.flatMap(([uid, a, b]) => ['BEGIN:VEVENT', `UID:${uid}`, `DTSTART;VALUE=DATE:${a.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${b.replace(/-/g, '')}`, 'SUMMARY:CLOSED - Not available', 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n')
const FEED = 'https://admin.booking.com/hotel/hoteladmin/ical.html?t=GEHEIMES-TOKEN'
beforeEach(() => { T.clear(); net.responses = {}; net.calls.length = 0 })

describe('Unterkünfte', () => {
  it('anlegen, auflisten; Kalender-Link vorhanden, rohe Geheimnisse nicht', async () => {
    const u = await mkUnit()
    expect(u.icalUrl).toMatch(/^https:\/\/app\.plexora\.eu\/api\/public\/fewo\/ical\/[0-9a-f-]{36}\.[A-Za-z0-9_-]{32}\.ics$/)
    expect(u).not.toHaveProperty('icalToken')
    const list = (await call(H.units, ev(OWNER))).res.units
    expect(list).toHaveLength(1)
  })
  it('Mandanten sind getrennt; ein Mitglied arbeitet im Konto des Inhabers; Demo darf nichts anlegen', async () => {
    await mkUnit()
    expect((await call(H.units, ev(OTHER))).res.units).toEqual([])
    expect((await call(H.units, ev(MEMBER))).res.units).toHaveLength(1)
    expect((await call(H.unitCreate, ev(DEMO, { body: { name: 'x' } }))).code).toBe(403)
    expect((await call(H.units, ev({}))).code).toBe(401)
  })
  it('fremde oder falsche IDs: einheitlich 404', async () => {
    const u = await mkUnit()
    expect((await call(H.unitPut, withId(u.unitId, OTHER, { name: 'Hack' }))).code).toBe(404)
    expect((await call(H.unitDel, withId('../../x', OWNER))).code).toBe(404)
    expect((await call(H.rotate, withId('00000000-0000-4000-8000-000000000000', OWNER))).code).toBe(404)
  })
  it('ungültige Eingaben: 400 mit Meldung', async () => {
    expect((await call(H.unitCreate, ev(OWNER, { body: { name: '' } }))).code).toBe(400)
    expect((await call(H.unitCreate, ev(OWNER, { body: { name: 'x', nightlyRate: -5 } }))).msg).toMatch(/Preis/)
  })
  it('Ändern lässt Kanäle und Link unberührt; Löschen nur ohne zukünftige Buchung', async () => {
    const u = await mkUnit()
    expect((await call(H.unitPut, withId(u.unitId, OWNER, { name: 'Neu', nightlyRate: 120 }))).res.unit).toMatchObject({ name: 'Neu', nightlyRate: 120, icalUrl: u.icalUrl })
    const b = (await book(u.unitId)).res.booking
    expect((await call(H.unitDel, withId(u.unitId))).code).toBe(409)
    await call(H.bookDel, withId(b.bookingId))
    expect((await call(H.unitDel, withId(u.unitId))).code).toBe(200)
    expect((await call(H.units, ev(OWNER))).res.units).toEqual([])
  })
})

describe('Buchungen', () => {
  it('Preis aus der Unterkunft: Nächte, Reinigung, Kurtaxe', async () => {
    const u = await mkUnit()
    const b = (await book(u.unitId)).res.booking
    expect(b).toMatchObject({ nights: 3, accommodation: 300, cleaning: 50, tax: 12, total: 362, status: 'confirmed', source: 'manual' })
  })
  it('Überschneidung wird abgelehnt (409), Abreisetag = Anreisetag ist erlaubt, stornierte Buchungen blockieren nicht', async () => {
    const u = await mkUnit()
    expect((await book(u.unitId)).code).toBe(200)
    const clash = await book(u.unitId, { guestName: 'Ben', checkIn: day(12), checkOut: day(15) })
    expect(clash.code).toBe(409); expect(clash.msg).toMatch(/schon belegt.*Anna/)
    expect((await book(u.unitId, { guestName: 'Ben', checkIn: day(13), checkOut: day(15) })).code).toBe(200)
    const a = (await book(u.unitId, { guestName: 'Cem', checkIn: day(20), checkOut: day(22), status: 'cancelled' })).res.booking
    expect((await book(u.unitId, { guestName: 'Dora', checkIn: day(20), checkOut: day(22) })).code).toBe(200)
    expect(a.status).toBe('cancelled')
  })
  it('Personenzahl, Mindestaufenthalt, Pflichtfelder, fremde Unterkunft', async () => {
    const u = await mkUnit({ minNights: 2 })
    expect((await book(u.unitId, { guests: 9 })).msg).toMatch(/höchstens 4/)
    expect((await book(u.unitId, { checkOut: day(11) })).msg).toMatch(/Mindestaufenthalt/)
    expect((await book(u.unitId, { guestName: '' })).code).toBe(400)
    expect((await book(u.unitId, { guestEmail: 'kaputt' })).code).toBe(400)
    expect((await book(u.unitId, {}, OTHER)).code).toBe(404)
    expect((await book(u.unitId, {}, DEMO)).code).toBe(403)
  })
  it('Sperrzeit braucht keinen Gast und hat keinen Preis', async () => {
    const u = await mkUnit()
    const b = (await book(u.unitId, { status: 'blocked', guestName: '' })).res.booking
    expect(b.status).toBe('blocked'); expect(b).not.toHaveProperty('total')
  })
  it('Ändern: Preis wird bei neuen Daten neu gerechnet, ein von Hand gesetzter Preis bleibt sonst; eigene Zeit zählt nicht als Konflikt', async () => {
    const u = await mkUnit()
    const b = (await book(u.unitId, { priceOverride: 300 })).res.booking
    expect(b.total).toBe(300)
    const same = (await call(H.bookPut, withId(b.bookingId, OWNER, { notes: 'Notiz' }))).res.booking
    expect(same.total).toBe(300)
    const moved = (await call(H.bookPut, withId(b.bookingId, OWNER, { checkOut: day(14) }))).res.booking
    expect(moved).toMatchObject({ nights: 4, total: 100 * 4 + 50 + 2 * 2 * 4 })
    expect((await call(H.bookPut, withId(b.bookingId, OTHER, { notes: 'x' }))).code).toBe(404)
  })
  it('Liste mit Zeitraum-Filter; Doppelbelegung wird markiert', async () => {
    const u = await mkUnit()
    await book(u.unitId, { checkIn: day(10), checkOut: day(13) })
    await book(u.unitId, { checkIn: day(40), checkOut: day(42), guestName: 'Spät' })
    const all = (await call(H.bookings, ev(OWNER))).res.bookings
    expect(all.map((x: any) => x.guestName)).toEqual(['Anna', 'Spät'])
    const inRange = (await call(H.bookings, ev(OWNER, { query: { from: day(5), to: day(20) } }))).res.bookings
    expect(inRange).toHaveLength(1)
    expect(all.every((x: any) => x.conflict === false)).toBe(true)
  })
})

describe('Kanal-Kalender (iCal-Abgleich)', () => {
  it('Adresse prüfen: nur https, nicht intern, nicht localhost, keine Zugangsdaten', async () => {
    const u = await mkUnit()
    for (const url of ['http://x.example/cal.ics', 'https://127.0.0.1/cal.ics', 'https://localhost/cal.ics', 'https://intern.example/cal.ics', 'https://user:pw@x.example/cal.ics', 'ftp://x.example/a', 'kein-link'])
      expect((await call(H.feedAdd, withId(u.unitId, OWNER, { name: 'K', url }))).code, url).toBe(400)
    expect(net.calls).toEqual([])    // keine dieser Adressen wurde je aufgerufen
  })
  it('Weiterleitung auf eine interne Adresse wird nicht gefolgt', async () => {
    const u = await mkUnit()
    net.responses[FEED] = { status: 302, location: 'https://127.0.0.1/geheim' }
    const r = await call(H.feedAdd, withId(u.unitId, OWNER, { name: 'Booking', url: FEED }))
    expect(r.code).toBe(422); expect(net.calls).toEqual([FEED])
  })
  it('Kanal hinzufügen liest ein: Sperrzeiten entstehen, Adresse bleibt verborgen, Fehler am Kanal', async () => {
    const u = await mkUnit()
    net.responses[FEED] = { body: ics(['b1', day(10), day(13)], ['b2', day(20), day(22)]) }
    const r = await call(H.feedAdd, withId(u.unitId, OWNER, { name: 'Booking', url: FEED }))
    expect(r.code).toBe(200); expect(r.res.result).toMatchObject({ added: 2 })
    expect(JSON.stringify(r.res)).not.toContain('GEHEIMES-TOKEN')
    expect(r.res.unit.feeds[0]).toMatchObject({ name: 'Booking', host: 'admin.booking.com', lastStatus: 'ok' })
    const rows = (await call(H.bookings, ev(OWNER))).res.bookings
    expect(rows).toHaveLength(2); expect(rows.every((b: any) => b.status === 'blocked' && b.source.startsWith('ical:'))).toBe(true)
  })
  it('Abgleich: geänderte Termine werden angepasst, verschwundene zukünftige gelöscht, vergangene bleiben, nichts doppelt', async () => {
    const u = await mkUnit()
    net.responses[FEED] = { body: ics(['b1', day(10), day(13)], ['b2', day(20), day(22)], ['alt', day(-10), day(-8)]) }
    await call(H.feedAdd, withId(u.unitId, OWNER, { name: 'Booking', url: FEED }))
    net.responses[FEED] = { body: ics(['b1', day(11), day(14)]) }            // b2 storniert, b1 verschoben, "alt" fehlt, ist aber vergangen
    const r = await call(H.sync, withId(u.unitId))
    expect(r.code).toBe(200)
    const rows = (await call(H.bookings, ev(OWNER))).res.bookings
    expect(rows.map((b: any) => [b.uid, b.checkIn])).toEqual([['alt', day(-10)], ['b1', day(11)]])
    await call(H.sync, withId(u.unitId))
    expect((await call(H.bookings, ev(OWNER))).res.bookings).toHaveLength(2)
  })
  it('ein kaputter Kanal bricht den Abgleich nicht ab; der Fehler steht am Kanal', async () => {
    const u = await mkUnit()
    net.responses[FEED] = { body: ics(['b1', day(10), day(13)]) }
    await call(H.feedAdd, withId(u.unitId, OWNER, { name: 'Booking', url: FEED }))
    net.responses[FEED] = { status: 500 }
    const r = await call(H.sync, withId(u.unitId))
    expect(r.code).toBe(200); expect(r.res.unit.feeds[0]).toMatchObject({ lastStatus: 'error', lastError: expect.stringContaining('500') })
    expect((await call(H.bookings, ev(OWNER))).res.bookings).toHaveLength(1)    // bisherige Sperrzeit bleibt
  })
  it('Doppelbelegung durch einen Kanal wird markiert; Kanal-Sperrzeiten sind nicht änderbar; Kanal entfernen räumt auf', async () => {
    const u = await mkUnit()
    const mine = (await book(u.unitId)).res.booking
    net.responses[FEED] = { body: ics(['b1', day(11), day(12)]) }
    const add = await call(H.feedAdd, withId(u.unitId, OWNER, { name: 'Booking', url: FEED }))
    const rows = (await call(H.bookings, ev(OWNER))).res.bookings
    expect(rows.every((b: any) => b.conflict === true)).toBe(true)
    const imported = rows.find((b: any) => b.source.startsWith('ical:'))
    expect((await call(H.bookPut, withId(imported.bookingId, OWNER, { notes: 'x' }))).code).toBe(409)
    expect((await call(H.bookDel, withId(imported.bookingId))).code).toBe(409)
    expect((await call(H.feedDel, withId(u.unitId, OWNER, undefined, { feedId: add.res.unit.feeds[0].feedId }))).code).toBe(200)
    expect((await call(H.bookings, ev(OWNER))).res.bookings.map((b: any) => b.bookingId)).toEqual([mine.bookingId])
  })
  it('Höchstens 5 Kanäle; fremde Unterkunft: 404; Demo: 403', async () => {
    const u = await mkUnit()
    expect((await call(H.feedAdd, withId(u.unitId, OTHER, { name: 'K', url: FEED }))).code).toBe(404)
    expect((await call(H.feedAdd, withId(u.unitId, DEMO, { name: 'K', url: FEED }))).code).toBe(403)
    for (let n = 0; n < 5; n++) { net.responses[FEED + n] = { body: ics() }; expect((await call(H.feedAdd, withId(u.unitId, OWNER, { name: 'K' + n, url: FEED + n }))).code).toBe(200) }
    expect((await call(H.feedAdd, withId(u.unitId, OWNER, { name: 'K6', url: FEED + 6 }))).code).toBe(400)
  })
})

describe('Öffentlicher Kalender-Link', () => {
  const get = (ref: string, query: any = {}) => call(H.ical, ev({}, { params: { ref }, query }))
  const refOf = (u: any) => u.icalUrl.split('/ical/')[1]
  it('liefert nur "Belegt" mit Datum: keine Namen, Mails, Preise', async () => {
    const u = await mkUnit()
    await book(u.unitId, { guestName: 'Anna Geheim', guestEmail: 'anna@geheim.de', notes: 'Vertraulich', priceOverride: 777 })
    const r = await get(refOf(u))
    expect(r.code).toBe(200); expect(r.res).toContain('SUMMARY:Belegt')
    for (const s of ['Anna', 'geheim', 'Vertraulich', '777', 'chef@firma.de']) expect(r.res).not.toContain(s)
  })
  it('falsches Geheimnis, falsche Form, fremde ID: einheitlich 404', async () => {
    const u = await mkUnit()
    const [id] = refOf(u).split('.')
    for (const ref of [`${id}.${'x'.repeat(32)}.ics`, `${id}.ics`, 'quatsch', `${id}.${'A'.repeat(32)}`, '00000000-0000-4000-8000-000000000000.' + 'A'.repeat(32) + '.ics']) expect((await get(ref)).code, ref).toBe(404)
  })
  it('Standard: nur eigene Buchungen und Sperrzeiten; Kanalbelegungen nur mit ?kanaele=1, ohne den eigenen Kanal', async () => {
    const u = await mkUnit()
    await book(u.unitId, { checkIn: day(5), checkOut: day(7) })
    net.responses[FEED] = { body: ics(['b1', day(20), day(22)]) }
    const add = await call(H.feedAdd, withId(u.unitId, OWNER, { name: 'Booking', url: FEED }))
    const fid = add.res.unit.feeds[0].feedId
    const events = (s: string) => (s.match(/BEGIN:VEVENT/g) || []).length
    expect(events((await get(refOf(u))).res)).toBe(1)
    expect(events((await get(refOf(u), { kanaele: '1' })).res)).toBe(2)
    expect(events((await get(refOf(u), { kanaele: '1', ohne: fid })).res)).toBe(1)
  })
  it('stornierte Buchungen erscheinen nicht; neuer Link macht den alten ungültig', async () => {
    const u = await mkUnit()
    await book(u.unitId, { status: 'cancelled' })
    expect((await get(refOf(u))).res).not.toContain('BEGIN:VEVENT')
    const fresh = (await call(H.rotate, withId(u.unitId))).res.unit
    expect((await get(refOf(u))).code).toBe(404)
    expect((await get(refOf(fresh))).code).toBe(200)
  })
})

describe('Rechnung aus Buchung', () => {
  it('nur aus bestätigter Buchung, nur einmal, mit Positionen; Anfrage nicht', async () => {
    const u = await mkUnit()
    const inq = (await book(u.unitId, { status: 'inquiry', checkIn: day(30), checkOut: day(32) })).res.booking
    expect((await call(H.toInvoice, withId(inq.bookingId))).code).toBe(409)
    const b = (await book(u.unitId)).res.booking
    const r = await call(H.toInvoice, withId(b.bookingId))
    expect(r.code).toBe(200)
    const inv = [...tbl('plexora-finance').values()][0]
    expect(inv).toMatchObject({ userId: 'chef@firma.de', client: 'Anna', amount: 362, status: 'pending', fewoBookingId: b.bookingId })
    expect(inv.items.map((i: any) => i.description)).toEqual([expect.stringContaining('Übernachtung Seeblick'), 'Endreinigung', 'Kurtaxe'])
    expect((await call(H.toInvoice, withId(b.bookingId))).code).toBe(409)
    expect(tbl('plexora-finance').size).toBe(1)
    expect((await call(H.bookDel, withId(b.bookingId))).code).toBe(409)
  })
  it('von Hand gesetzter Gesamtpreis steht als eine Position; fremde Buchung 404; Demo 403', async () => {
    const u = await mkUnit()
    const b = (await book(u.unitId, { priceOverride: 280 })).res.booking
    expect((await call(H.toInvoice, withId(b.bookingId, OTHER))).code).toBe(404)
    expect((await call(H.toInvoice, withId(b.bookingId, DEMO))).code).toBe(403)
    await call(H.toInvoice, withId(b.bookingId))
    const inv = [...tbl('plexora-finance').values()][0]
    expect(inv.amount).toBe(280); expect(inv.items).toHaveLength(1)
  })
})
