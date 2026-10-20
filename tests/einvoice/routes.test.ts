import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { fromRecord, toCii } from '../../shared/einvoice'
import { extractEmbeddedXml } from '../../server/utils/zugferd'

const company = { legalName: 'Muster IT GmbH', street: 'Hauptstraße 12', zipCity: '50667 Köln', country: 'Deutschland', email: 'rechnung@muster-it.de', phone: '+49 221 1234567', vatId: 'DE123456789', iban: 'DE89 3704 0044 0532 0130 00', contactName: 'Erika Mustermann' }
const inv = (over: any = {}) => ({ invoiceId: 'i-1', userId: 'chef@a.de', number: 'RE-1', created: '2026-10-20T10:00:00Z', dueDate: '2026-11-03', client: 'Beispiel AG', clientStreet: 'Marktplatz 1', clientZip: '80331', clientCity: 'München', clientEmail: 'k@beispiel.de', items: [{ description: 'Beratung', qty: 2, price: 100 }], amount: 200, ...over })
const db = { finance: new Map<string, any>(), settings: new Map<string, any>(), incoming: new Map<string, any>() }
class HttpError extends Error { statusCode: number; data: any; constructor(o: any) { super(o.message); this.statusCode = o.statusCode; this.data = o.data } }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input
  if (i.TableName === 'plexora-finance' && c === 'ScanCommand') { const r = db.finance.get(i.ExpressionAttributeValues[':id']); return { Items: r && r.userId === i.ExpressionAttributeValues[':u'] ? [r] : [] } }
  if (i.TableName === 'plexora-settings' && c === 'GetCommand') return { Item: db.settings.get(`${i.Key.settingId}|${i.Key.scope}`) }
  if (i.TableName === 'plexora-invoice-templates') return {}
  if (i.TableName === 'plexora-finance-incoming') {
    const k = (u: string, id: string) => `${u}|${id}`
    if (c === 'QueryCommand') return { Items: [...db.incoming.values()].filter(x => x.userId === i.ExpressionAttributeValues[':u']) }
    if (c === 'PutCommand') { db.incoming.set(k(i.Item.userId, i.Item.incomingId), structuredClone(i.Item)); return {} }
    if (c === 'GetCommand') return { Item: db.incoming.get(k(i.Key.userId, i.Key.incomingId)) }
    if (c === 'DeleteCommand') { db.incoming.delete(k(i.Key.userId, i.Key.incomingId)); return {} }
    if (c === 'UpdateCommand') { const r = db.incoming.get(k(i.Key.userId, i.Key.incomingId)); if (r) { r.status = i.ExpressionAttributeValues[':s']; r.paidAt = i.ExpressionAttributeValues[':p'] }; return {} }
  }
  return {}
} }) }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => e }))
vi.mock('../../server/utils/invoiceTemplate', () => ({ renderInvoiceTemplateToPdf: async () => { const d = await PDFDocument.create(); d.addPage().drawText('Rechnung'); return Buffer.from(await d.save()) } }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
const headers: Record<string, string> = {}
vi.stubGlobal('setResponseHeader', (_e: any, n: string, v: string) => { headers[n] = v })
const H: Record<string, any> = {}
beforeAll(async () => {
  const F = '../../server/api/finance/'
  H.xr = (await import(`${F}[id]/xrechnung.get`)).default; H.zf = (await import(`${F}[id]/zugferd.get`)).default; H.check = (await import(`${F}[id]/einvoice-check.get`)).default
  H.imp = (await import(`${F}incoming/import.post`)).default; H.save = (await import(`${F}incoming/index.post`)).default; H.list = (await import(`${F}incoming/index.get`)).default
  H.xml = (await import(`${F}incoming/[id]/xml.get`)).default; H.patch = (await import(`${F}incoming/[id]/index.patch`)).default; H.del = (await import(`${F}incoming/[id]/index.delete`)).default
})
beforeEach(() => { db.finance.clear(); db.settings.clear(); db.incoming.clear(); db.finance.set('i-1', inv()); db.settings.set('company|chef@a.de', company); db.settings.set('invoice|chef@a.de', { vatRate: 19, dueText: 'Zahlbar in 14 Tagen' }) })
const ev = (email: string | null, params: any = {}, body?: any, groups: string[] = ['customers']) => ({ context: { auth: email ? { userId: 'u', email, groups } : undefined }, params, body })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number, msg: x.message, data: x.data } } }

describe('E-Rechnung des Ausstellers', () => {
  it('XRechnung: vollständig → XML, nur für den Aussteller (fremder Mandant 404, anonym 401)', async () => {
    const r = await call(H.xr, ev('chef@a.de', { id: 'i-1' }))
    expect(r.code).toBe(200); expect(r.res).toContain('xrechnung_3.0'); expect(headers['Content-Disposition']).toContain('RE-1_XRechnung.xml')
    expect((await call(H.xr, ev('fremd@b.de', { id: 'i-1' }))).code).toBe(404)
    expect((await call(H.xr, ev(null, { id: 'i-1' }))).code).toBe(401)
  })
  it('fehlende Pflichtangaben: 422 mit der Liste', async () => {
    db.settings.set('company|chef@a.de', { legalName: 'Muster IT GmbH' })
    const r = await call(H.xr, ev('chef@a.de', { id: 'i-1' }))
    expect(r.code).toBe(422); expect(r.msg).toContain('USt-IdNr.'); expect(r.msg).toContain('IBAN'); expect(r.data.problems.length).toBeGreaterThan(3)
    expect((await call(H.zf, ev('chef@a.de', { id: 'i-1' }))).code).toBe(422)
  })
  it('ZUGFeRD: PDF mit eingebetteter, zur Rechnung passender XML', async () => {
    const r = await call(H.zf, ev('chef@a.de', { id: 'i-1' }))
    expect(r.code).toBe(200); expect(headers['Content-Type']).toBe('application/pdf')
    const xml = await extractEmbeddedXml(r.res)
    expect(xml).toBe(toCii(fromRecord(inv(), company, { vatRate: 19, dueText: 'Zahlbar in 14 Tagen' }), 'zugferd'))
  })
  it('Prüfroute: Probleme je Format und Summen', async () => {
    db.settings.set('company|chef@a.de', { ...company, contactName: '', representedBy: '', phone: '' })
    const r = (await call(H.check, ev('chef@a.de', { id: 'i-1' }))).res
    expect(r.xrechnung.some((p: any) => p.level === 'error')).toBe(true); expect(r.zugferd.some((p: any) => p.level === 'error')).toBe(false)
    expect(r.totals).toEqual({ net: 200, tax: 38, gross: 238 })
  })
})

const xmlOf = (n = 'RE-9') => toCii({ ...fromRecord(inv({ number: n }), company, { vatRate: 19 }) }, 'zugferd')
describe('Eingangsrechnungen', () => {
  it('Vorschau liest und prüft, ohne zu speichern; anonym 401', async () => {
    const r = await call(H.imp, ev('chef@a.de', {}, { xml: xmlOf() }))
    expect(r.code).toBe(200); expect(r.res.invoice.number).toBe('RE-9'); expect(r.res.invoice.totals.gross).toBe(238); expect(r.res.hints).toEqual([])
    expect(db.incoming.size).toBe(0)
    expect((await call(H.imp, ev(null, {}, { xml: xmlOf() }))).code).toBe(401)
  })
  it('speichern, auflisten (ohne XML), Stand ändern, Original laden, löschen; Mandantentrennung', async () => {
    const s = await call(H.save, ev('chef@a.de', {}, { xml: xmlOf() }))
    expect(s.code).toBe(200); const id = s.res.record.incomingId; expect(s.res.record.xml).toBeUndefined(); expect(s.res.record.status).toBe('offen')
    const l = (await call(H.list, ev('chef@a.de'))).res.records; expect(l.length).toBe(1); expect(l[0].xml).toBeUndefined(); expect(l[0].payable).toBe(238)
    expect((await call(H.list, ev('fremd@b.de'))).res.records).toEqual([])
    expect((await call(H.xml, ev('fremd@b.de', { id }))).code).toBe(404)
    expect((await call(H.xml, ev('chef@a.de', { id }))).res).toBe(xmlOf())
    expect((await call(H.patch, ev('chef@a.de', { id }, { status: 'bezahlt' }))).code).toBe(200); expect(db.incoming.get(`chef@a.de|${id}`).status).toBe('bezahlt')
    expect((await call(H.patch, ev('chef@a.de', { id }, { status: 'egal' }))).code).toBe(400)
    expect((await call(H.patch, ev('fremd@b.de', { id }, { status: 'bezahlt' }))).code).toBe(404)
    await call(H.del, ev('fremd@b.de', { id })); expect(db.incoming.size).toBe(1)
    await call(H.del, ev('chef@a.de', { id })); expect(db.incoming.size).toBe(0)
  })
  it('doppelt (gleiche Nummer, gleicher Rechnungssteller) 409, Demo-Konto darf nicht speichern', async () => {
    expect((await call(H.save, ev('chef@a.de', {}, { xml: xmlOf() }))).code).toBe(200)
    expect((await call(H.save, ev('chef@a.de', {}, { xml: xmlOf() }))).code).toBe(409)
    expect((await call(H.save, ev('demo@plexora.eu', {}, { xml: xmlOf('RE-10') }, ['demo']))).code).toBe(403)
    expect(db.incoming.size).toBe(1)
  })
  it('ZUGFeRD-PDF wird gelesen; PDF ohne E-Rechnung, Müll und leere Eingabe ergeben 400', async () => {
    const { embedZugferd } = await import('../../server/utils/zugferd')
    const d = await PDFDocument.create(); d.addPage()
    const hybrid = Buffer.from(await embedZugferd(await d.save(), xmlOf('RE-11'), 'x')).toString('base64')
    const r = await call(H.imp, ev('chef@a.de', {}, { pdfBase64: hybrid })); expect(r.code).toBe(200); expect(r.res.source).toBe('pdf'); expect(r.res.invoice.number).toBe('RE-11')
    const plain = await PDFDocument.create(); plain.addPage()
    expect((await call(H.imp, ev('chef@a.de', {}, { pdfBase64: Buffer.from(await plain.save()).toString('base64') }))).code).toBe(400)
    expect((await call(H.imp, ev('chef@a.de', {}, { xml: '<x/>' }))).code).toBe(400)
    expect((await call(H.imp, ev('chef@a.de', {}, {}))).code).toBe(400)
    expect((await call(H.imp, ev('chef@a.de', {}, { pdfBase64: 'A'.repeat(4_000_001) }))).code).toBe(400)
  })
  it('Hinweis, wenn Summen nicht zu den Positionen passen', async () => {
    const bad = xmlOf().replace('<ram:GrandTotalAmount>238.00', '<ram:GrandTotalAmount>999.00').replace('<ram:TaxBasisTotalAmount>200.00', '<ram:TaxBasisTotalAmount>150.00')
    expect((await call(H.imp, ev('chef@a.de', {}, { xml: bad }))).res.hints.length).toBeGreaterThan(0)
  })
})
