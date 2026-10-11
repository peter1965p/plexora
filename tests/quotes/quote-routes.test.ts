import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// ── Fakes: DynamoDB mit Bedingungen und Update-Ausdrücken (die hier genutzten), Resend, PDF, Benachrichtigung ──
const T = new Map<string, Map<string, any>>()
const tbl = (n: string) => { if (!T.has(n)) T.set(n, new Map()); return T.get(n)! }
const keyOf = (n: string, k: any) => n === 'plexora-quotes' ? `${k.userId}|${k.quoteId}` : n === 'plexora-settings' ? `${k.settingId}|${k.scope}` : n === 'plexora-newsletter-ratelimit' ? k.throttleKey : JSON.stringify(k)
const st = { mails: [] as any[], mailError: false, notes: [] as any[], pdfs: 0, enforce: '' as any }
class HttpError extends Error { statusCode: number; data: any; constructor(o: any) { super(o.message); this.statusCode = o.statusCode; this.data = o.data } }
function cond(item: any, i: any) {
  const ce = i.ConditionExpression; if (!ce) return true; const v = i.ExpressionAttributeValues || {}; const n = i.ExpressionAttributeNames || {}
  let m
  if ((m = ce.match(/^attribute_not_exists\((\w+)\)$/))) return !item || item[m[1]] === undefined
  if ((m = ce.match(/^(#\w+) = (:\w+)$/))) return !!item && item[n[m[1]]] === v[m[2]]
  if ((m = ce.match(/^(#\w+) IN \((:\w+), (:\w+)\)$/))) return !!item && [v[m[2]], v[m[3]]].includes(item[n[m[1]]])
  throw new Error('Bedingung nicht unterstützt: ' + ce)
}
const fakeDb = { async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input, t = tbl(i.TableName)
  const fail = () => { const e: any = new Error('c'); e.name = 'ConditionalCheckFailedException'; throw e }
  if (c === 'PutCommand') { const k = keyOf(i.TableName, i.TableName === 'plexora-settings' ? i.Item : i.Item.userId ? { userId: i.Item.userId, quoteId: i.Item.quoteId, invoiceId: i.Item.invoiceId } : i.Item); if (!cond(t.get(k), i)) fail(); t.set(k, { ...i.Item }); return {} }
  if (c === 'GetCommand') return { Item: t.get(keyOf(i.TableName, i.Key)) ? { ...t.get(keyOf(i.TableName, i.Key)) } : undefined }
  if (c === 'QueryCommand') return { Items: [...t.values()].filter(x => x.userId === i.ExpressionAttributeValues[':u']).map(x => ({ ...x })) }
  if (c === 'ScanCommand') return { Items: [...t.values()].filter(x => x.quoteId === i.ExpressionAttributeValues[':q']).map(x => ({ ...x })) }
  if (c === 'DeleteCommand') { t.delete(keyOf(i.TableName, i.Key)); return {} }
  if (c === 'UpdateCommand') {
    const k = keyOf(i.TableName, i.Key); const cur = t.get(k); const v = i.ExpressionAttributeValues || {}; const n = i.ExpressionAttributeNames || {}
    if (i.TableName === 'plexora-newsletter-ratelimit') { const row = cur || {}; row.count = (row.count || 0) + v[':one']; t.set(k, row); return { Attributes: { ...row } } }
    if (!cond(cur, i)) fail(); const row = { ...(cur || {}) }
    const [setPart, removePart] = String(i.UpdateExpression).replace(/^SET /, '').split(' REMOVE ')
    for (const a of setPart.split(',')) { const [l, r] = a.split('=').map(s => s.trim()); row[n[l] || l] = v[r] }
    for (const r of (removePart || '').split(',').map(s => s.trim()).filter(Boolean)) delete row[r]
    t.set(k, row); return { Attributes: { ...row } }
  }
  return {}
} }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDb }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => (e === 'sylvia@firma.de' ? 'chef@firma.de' : e) }))
vi.mock('resend', () => ({ Resend: class { emails = { send: async (m: any) => { st.mails.push(m); return st.mailError ? { data: null, error: { message: 'x' } } : { data: { id: '1' }, error: null } } } } }))
vi.mock('../../server/utils/invoiceTemplate', async (orig) => ({ ...(await orig() as any), renderInvoicePdf: async (html: string) => { st.pdfs++; return Buffer.from('%PDF-1.4 ' + html.length) } }))
vi.mock('../../server/utils/notifications', () => ({ notifySystem: async (n: any) => { st.notes.push(n) } }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
vi.stubGlobal('setResponseHeaders', () => {}); vi.stubGlobal('setResponseHeader', () => {}); vi.stubGlobal('setHeader', (e: any, n: string, v: string) => { (e.out ||= {})[n] = v })
vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 'k', planEnforce: st.enforce, adminEmail: '' }))
vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {})

const H: Record<string, any> = {}
beforeAll(async () => {
  const load = async (n: string, p: string) => { H[n] = (await import(p)).default }
  await load('list', '../../server/api/quotes/index.get'); await load('create', '../../server/api/quotes/index.post'); await load('get', '../../server/api/quotes/[id]/index.get')
  await load('put', '../../server/api/quotes/[id]/index.put'); await load('del', '../../server/api/quotes/[id]/index.delete'); await load('pdf', '../../server/api/quotes/[id]/pdf.get')
  await load('status', '../../server/api/quotes/[id]/status.post'); await load('toInvoice', '../../server/api/quotes/[id]/to-invoice.post'); await load('send', '../../server/api/quotes/[id]/send.post')
  await load('pubGet', '../../server/api/public/quote/[ref]/index.get'); await load('pubRespond', '../../server/api/public/quote/[ref]/respond.post')
})
const user = (email: string, groups: string[] = ['customers']) => ({ userId: 's-' + email, email, groups })
const OWNER = user('chef@firma.de'), OTHER = user('fremd@firma.de'), DEMO = user('demo@plexora.eu'), MEMBER = user('sylvia@firma.de')
let ipN = 0
const ev = (auth: any, over: any = {}) => ({ context: { auth }, params: {}, headers: { 'x-forwarded-for': `203.0.113.${++ipN % 250}` }, query: {}, ...over })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number, msg: x.message, data: x.data } } }
const future = (d = 14) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)
const input = (o: any = {}) => ({ client: 'Max Muster', clientEmail: 'max@kunde.de', title: 'Aktion Website', items: [{ description: 'Website Paket 450 EUR', qty: 1, price: 450 }], validUntil: future(), ...o })
const mk = async (o: any = {}, who = OWNER) => (await call(H.create, ev(who, { body: input(o) }))).res.quote
const withId = (id: string, who = OWNER, body?: any) => ev(who, { params: { id }, body })
const rawQuote = (id: string, tenant = 'chef@firma.de') => tbl('plexora-quotes').get(`${tenant}|${id}`)
const refOf = (mail: any) => (mail.text as string).match(/\/angebot\/([0-9a-f-]{36}\.[A-Za-z0-9_-]{32})/)![1]
beforeEach(() => { T.clear(); st.mails.length = 0; st.mailError = false; st.notes.length = 0; st.pdfs = 0; st.enforce = '' })

describe('Anlegen, Liste, Mandantentrennung', () => {
  it('Entwurf mit Nummer AN-<Jahr>-001, Summen mit 19 % und festgehaltenem Steuersatz', async () => {
    const r = await call(H.create, ev(OWNER, { body: input() })); expect(r.code).toBe(200)
    expect(r.res.quote).toMatchObject({ number: `AN-${new Date().getFullYear()}-001`, status: 'draft', net: 450, vat: 85.5, gross: 535.5, vatRate: 19, smallBusiness: false, source: 'manual' }); expect(r.res.quote.acceptHash).toBeUndefined()
    expect((await mk()).number).toMatch(/-002$/)
  })
  it('Kleinunternehmer-Einstellung: keine MwSt', async () => {
    tbl('plexora-settings').set('invoice|chef@firma.de', { settingId: 'invoice', scope: 'chef@firma.de', smallBusiness: true, vatRate: 19 })
    expect(await mk()).toMatchObject({ net: 450, vat: 0, gross: 450, smallBusiness: true })
  })
  it('Nummern zählen je Mandant getrennt', async () => { await mk(); await mk(); expect((await mk({}, OTHER)).number).toMatch(/-001$/) })
  it('Eingabefehler: 400 mit Meldung, nichts gespeichert', async () => {
    for (const body of [input({ client: '' }), input({ items: [] }), input({ clientEmail: 'x' }), input({ validUntil: '2020-01-01' }), input({ items: [{ description: 'x', qty: 0, price: 1 }] }), null]) expect((await call(H.create, ev(OWNER, { body }))).code).toBe(400)
    expect(tbl('plexora-quotes').size).toBe(0)
  })
  it('Demo 403, ohne Anmeldung 401', async () => {
    expect((await call(H.create, ev(DEMO, { body: input() }))).code).toBe(403); expect((await call(H.create, ev(null, { body: input() }))).code).toBe(401); expect((await call(H.list, ev(null))).code).toBe(401)
  })
  it('Liste: nur der eigene Mandant, neueste zuerst; Team-Mitglied sieht die Angebote des Inhabers; nie der Hash', async () => {
    const a = await mk(); await new Promise(r => setTimeout(r, 5)); const b = await mk(); await mk({}, OTHER)
    const own = (await call(H.list, ev(OWNER))).res.quotes; expect(own.map((q: any) => q.quoteId)).toEqual([b.quoteId, a.quoteId])
    expect((await call(H.list, ev(OTHER))).res.quotes).toHaveLength(1); expect((await call(H.list, ev(MEMBER))).res.quotes).toHaveLength(2)
    expect(JSON.stringify(own)).not.toContain('acceptHash')
  })
  it('fremde oder unbekannte oder kaputte ID: 404 (kein Zugriff auf Angebote anderer Mandanten, auch nicht lesend, ändernd, löschend, als PDF, senden)', async () => {
    const q = await mk()
    for (const fn of ['get', 'put', 'del', 'pdf', 'status', 'toInvoice', 'send']) {
      expect((await call(H[fn], withId(q.quoteId, OTHER, input()))).code, fn).toBe(404)
      expect((await call(H[fn], withId('00000000-0000-4000-8000-000000000000', OWNER, input()))).code, fn).toBe(404); expect((await call(H[fn], withId('../x', OWNER, input()))).code, fn).toBe(404)
    }
    expect(rawQuote(q.quoteId)).toBeTruthy()
  })
  it('Herkunft: nur bekannte Werte, Verweis-IDs nur harmlose Zeichen', async () => {
    expect(await mk({ source: 'deal', dealId: 'd-1', contactId: '../x' })).toMatchObject({ source: 'deal', dealId: 'd-1' }); expect((await mk({ source: '<script>', contactId: '../x' })).contactId).toBeUndefined()
  })
})

describe('Ändern und Löschen', () => {
  it('Entwurf ändern: Summen neu, bleibt Entwurf', async () => {
    const q = await mk(); const r = await call(H.put, withId(q.quoteId, OWNER, input({ items: [{ description: 'x', qty: 2, price: 100 }] }))); expect(r.res.quote).toMatchObject({ net: 200, gross: 238, status: 'draft' })
  })
  it('gesendet/angenommen/abgelehnt: 409, nichts geändert; abgelaufen darf geändert werden und wird wieder Entwurf', async () => {
    const q = await mk(); await call(H.send, withId(q.quoteId)); expect((await call(H.put, withId(q.quoteId, OWNER, input({ client: 'Neu' })))).code).toBe(409); expect(rawQuote(q.quoteId).client).toBe('Max Muster')
    rawQuote(q.quoteId).validUntil = '2020-01-01'
    const r = await call(H.put, withId(q.quoteId, OWNER, input({ client: 'Neu' }))); expect(r.code).toBe(200); expect(r.res.quote).toMatchObject({ status: 'draft', client: 'Neu' }); expect(rawQuote(q.quoteId).acceptHash).toBeUndefined()
    for (const s of ['accepted', 'declined']) { rawQuote(q.quoteId).status = s; expect((await call(H.put, withId(q.quoteId, OWNER, input()))).code, s).toBe(409) }
  })
  it('Löschen: Entwurf/abgelehnt/abgelaufen ja, gesendet/angenommen nein, Demo 403', async () => {
    const q = await mk(); expect((await call(H.del, withId(q.quoteId, DEMO))).code).toBe(403); expect((await call(H.del, withId(q.quoteId))).code).toBe(200); expect(rawQuote(q.quoteId)).toBeUndefined()
    const s = await mk(); await call(H.send, withId(s.quoteId)); expect((await call(H.del, withId(s.quoteId))).code).toBe(409)
    rawQuote(s.quoteId).status = 'accepted'; expect((await call(H.del, withId(s.quoteId))).code).toBe(409); rawQuote(s.quoteId).status = 'declined'; expect((await call(H.del, withId(s.quoteId))).code).toBe(200)
  })
})

describe('Senden', () => {
  it('Mail mit PDF-Anhang und Annahme-Link; Status gesendet; gespeichert wird nur der Hash des Geheimnisses', async () => {
    const q = await mk(); const r = await call(H.send, withId(q.quoteId)); expect(r.code).toBe(200); expect(r.res.quote.status).toBe('sent')
    const m = st.mails[0]; expect(m.to).toBe('max@kunde.de'); expect(m.subject).toMatch(/^Angebot AN-\d{4}-001 von /); expect(m.attachments[0].filename).toMatch(/^Angebot-AN-\d{4}-001\.pdf$/); expect(Buffer.isBuffer(m.attachments[0].content)).toBe(true)
    const ref = refOf(m); expect(m.html).toContain(`https://app.plexora.eu/angebot/${ref}`); const secret = ref.split('.')[1]
    expect(JSON.stringify(rawQuote(q.quoteId))).not.toContain(secret); expect(rawQuote(q.quoteId).acceptHash).toMatch(/^[0-9a-f]{64}$/)
  })
  it('Empfänger nur aus dem Angebot; ohne Adresse 422; Gültigkeit vorbei 422; Demo 403; Resend-Fehler 502 und Status bleibt Entwurf', async () => {
    const noMail = await mk({ clientEmail: '' }); expect((await call(H.send, withId(noMail.quoteId))).code).toBe(422)
    const q = await mk(); expect((await call(H.send, withId(q.quoteId, DEMO))).code).toBe(403)
    rawQuote(q.quoteId).validUntil = '2020-01-01'; expect((await call(H.send, withId(q.quoteId))).code).toBe(422)
    rawQuote(q.quoteId).validUntil = future(); st.mailError = true; expect((await call(H.send, withId(q.quoteId))).code).toBe(502); expect(rawQuote(q.quoteId).status).toBe('draft'); expect(rawQuote(q.quoteId).acceptHash).toBeUndefined()
  })
  it('erneutes Senden erzeugt einen neuen Link, der alte verfällt; angenommene lassen sich nicht erneut senden', async () => {
    const q = await mk(); await call(H.send, withId(q.quoteId)); await call(H.send, withId(q.quoteId)); const [a, b] = st.mails.map(refOf); expect(a).not.toBe(b)
    expect((await call(H.pubGet, ev(null, { params: { ref: a } }))).code).toBe(404); expect((await call(H.pubGet, ev(null, { params: { ref: b } }))).code).toBe(200)
    rawQuote(q.quoteId).status = 'accepted'; expect((await call(H.send, withId(q.quoteId))).code).toBe(409)
  })
  it('HTML in Kundenname und Titel kommt maskiert in die Mail', async () => {
    const q = await mk({ client: '<img src=x onerror=alert(1)>', title: '"><script>x</script>' }); await call(H.send, withId(q.quoteId))
    expect(st.mails[0].html).not.toContain('<img'); expect(st.mails[0].html).not.toContain('<script'); expect(st.mails[0].html).toContain('&lt;img')
  })
  it('Tageslimit (Tarif): scharf bei Free an Dritte 402, nichts gesendet, Status bleibt', async () => {
    st.enforce = 'true'; const q = await mk(); const r = await call(H.send, withId(q.quoteId)); expect(r.code).toBe(402); expect(st.mails).toEqual([]); expect(rawQuote(q.quoteId).status).toBe('draft')
  })
})

describe('Kunde: ansehen und antworten (öffentlicher Link)', () => {
  const sent = async (o: any = {}) => { const q = await mk(o); await call(H.send, withId(q.quoteId)); return { q, ref: refOf(st.mails.at(-1)) } }
  it('Ansicht: nur das Angebot, keine Besitzer-/Mandantendaten', async () => {
    const { ref } = await sent(); const r = await call(H.pubGet, ev(null, { params: { ref } })); expect(r.code).toBe(200)
    expect(Object.keys(r.res).sort()).toEqual(['brand', 'canRespond', 'client', 'gross', 'intro', 'items', 'net', 'note', 'number', 'respondedAt', 'smallBusiness', 'title', 'validUntil', 'vat', 'vatRate', 'status'].sort())
    const txt = JSON.stringify(r.res); for (const secret of ['chef@firma.de', 'max@kunde.de', 'acceptHash', 'userId']) expect(txt, secret).not.toContain(secret)
    expect(r.res).toMatchObject({ status: 'sent', canRespond: true, gross: 535.5 })
  })
  it('falscher/kaputter/fremder Link: immer dieselbe 404', async () => {
    const { q, ref } = await sent(); const [id, secret] = ref.split('.')
    for (const bad of [`${id}.${'B'.repeat(32)}`, `${id}.${secret.slice(0, 31)}`, `${id}`, `00000000-0000-4000-8000-000000000000.${secret}`, `${id}.${secret}x`, '', '../x', `${id}.${secret}\n`, 12345 as any]) { const r = await call(H.pubGet, ev(null, { params: { ref: bad } })); expect(r.code, String(bad)).toBe(404); expect(r.msg).toMatch(/gibt es nicht/) }
    expect(rawQuote(q.quoteId).status).toBe('sent')
  })
  it('Entwurf hat keinen Link: kein Zugriff, auch nicht mit geratenem Geheimnis', async () => {
    const q = await mk(); expect((await call(H.pubGet, ev(null, { params: { ref: `${q.quoteId}.${'A'.repeat(32)}` } }))).code).toBe(404)
  })
  it('annehmen: Status angenommen, Besitzer wird benachrichtigt, zweite Antwort 409', async () => {
    const { q, ref } = await sent(); const r = await call(H.pubRespond, ev(null, { params: { ref }, body: { action: 'accept' } })); expect(r).toMatchObject({ code: 200, res: { success: true, status: 'accepted' } })
    expect(rawQuote(q.quoteId)).toMatchObject({ status: 'accepted', respondedBy: 'customer' }); expect(st.notes[0]).toMatchObject({ userId: 'chef@firma.de', type: 'quote_response' }); expect(st.notes[0].title).toMatch(/angenommen/)
    expect((await call(H.pubRespond, ev(null, { params: { ref }, body: { action: 'decline' } }))).code).toBe(409); expect(rawQuote(q.quoteId).status).toBe('accepted')
  })
  it('ablehnen; ungültige Aktion 400; abgelaufen 409; Entwurf/angenommen nicht beantwortbar', async () => {
    const { q, ref } = await sent(); expect((await call(H.pubRespond, ev(null, { params: { ref }, body: { action: 'lösche' } }))).code).toBe(400); expect((await call(H.pubRespond, ev(null, { params: { ref }, body: {} }))).code).toBe(400)
    rawQuote(q.quoteId).validUntil = '2020-01-01'; const late = await call(H.pubRespond, ev(null, { params: { ref }, body: { action: 'accept' } })); expect(late.code).toBe(409); expect(late.msg).toMatch(/nicht mehr gültig/); expect(rawQuote(q.quoteId).status).toBe('sent')
    expect((await call(H.pubGet, ev(null, { params: { ref } }))).res).toMatchObject({ status: 'expired', canRespond: false })
    rawQuote(q.quoteId).validUntil = future(); expect((await call(H.pubRespond, ev(null, { params: { ref }, body: { action: 'decline' } }))).res.status).toBe('declined')
  })
  it('gleichzeitige Antworten: genau eine zählt', async () => {
    const { q, ref } = await sent(); const r = await Promise.all([call(H.pubRespond, ev(null, { params: { ref }, body: { action: 'accept' } })), call(H.pubRespond, ev(null, { params: { ref }, body: { action: 'decline' } })), call(H.pubRespond, ev(null, { params: { ref }, body: { action: 'accept' } }))])
    expect(r.filter(x => x.code === 200)).toHaveLength(1); expect(['accepted', 'declined']).toContain(rawQuote(q.quoteId).status); expect(st.notes).toHaveLength(1)
  })
  it('Drossel je IP: nach 5 Antworten pro Minute 429', async () => {
    const { ref } = await sent(); const same = { 'x-forwarded-for': '198.51.100.9' }; const codes: number[] = []
    for (let i = 0; i < 7; i++) codes.push((await call(H.pubRespond, { context: {}, params: { ref: `${'1'.repeat(8)}-1111-4111-8111-111111111111.${'B'.repeat(32)}` }, headers: same, body: { action: 'accept' } })).code)
    expect(codes.slice(0, 5).every(c => c === 404)).toBe(true); expect(codes[5]).toBe(429)
  })
})

describe('Status von Hand und Rechnung', () => {
  it('Inhaber setzt ein gesendetes Angebot auf angenommen/abgelehnt; Entwurf nicht (409); falscher Wert 400; Demo 403', async () => {
    const q = await mk(); expect((await call(H.status, withId(q.quoteId, OWNER, { status: 'accepted' }))).code).toBe(409)
    await call(H.send, withId(q.quoteId)); expect((await call(H.status, withId(q.quoteId, OWNER, { status: 'sent' }))).code).toBe(400); expect((await call(H.status, withId(q.quoteId, DEMO, { status: 'accepted' }))).code).toBe(403)
    expect((await call(H.status, withId(q.quoteId, OWNER, { status: 'accepted' }))).res.quote).toMatchObject({ status: 'accepted' }); expect((await call(H.status, withId(q.quoteId, OWNER, { status: 'declined' }))).code).toBe(409)
  })
  it('Rechnung aus angenommenem Angebot: Kunde, Positionen, Betrag übernommen; Verweis gesetzt; nur einmal', async () => {
    const q = await mk(); await call(H.send, withId(q.quoteId)); await call(H.status, withId(q.quoteId, OWNER, { status: 'accepted' }))
    const r = await call(H.toInvoice, withId(q.quoteId)); expect(r.code).toBe(200)
    const inv = [...tbl('plexora-finance').values()][0]; expect(inv).toMatchObject({ userId: 'chef@firma.de', client: 'Max Muster', clientEmail: 'max@kunde.de', amount: 450, status: 'pending', quoteId: q.quoteId }); expect(inv.items).toEqual(q.items); expect(inv.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(rawQuote(q.quoteId).invoiceId).toBe(inv.invoiceId); const again = await call(H.toInvoice, withId(q.quoteId)); expect(again.code).toBe(409); expect(tbl('plexora-finance').size).toBe(1)
  })
  it('keine Rechnung aus Entwurf, offen gesendetem oder abgelehntem Angebot; Demo 403; gleichzeitige Klicks: eine Rechnung', async () => {
    const q = await mk(); expect((await call(H.toInvoice, withId(q.quoteId))).code).toBe(409); await call(H.send, withId(q.quoteId)); expect((await call(H.toInvoice, withId(q.quoteId))).code).toBe(409)
    rawQuote(q.quoteId).status = 'declined'; expect((await call(H.toInvoice, withId(q.quoteId))).code).toBe(409); rawQuote(q.quoteId).status = 'accepted'; expect((await call(H.toInvoice, withId(q.quoteId, DEMO))).code).toBe(403)
    const r = await Promise.all([call(H.toInvoice, withId(q.quoteId)), call(H.toInvoice, withId(q.quoteId)), call(H.toInvoice, withId(q.quoteId))]); expect(r.filter(x => x.code === 200)).toHaveLength(1); expect(tbl('plexora-finance').size).toBe(1)
  })
})

describe('PDF', () => {
  it('liefert ein PDF mit Dateinamen; Demo darf ansehen (nur lesen)', async () => {
    const q = await mk(); const e: any = withId(q.quoteId); const r = await call(H.pdf, e); expect(r.code).toBe(200); expect(Buffer.isBuffer(r.res)).toBe(true); expect(e.out['Content-Type']).toBe('application/pdf'); expect(e.out['Content-Disposition']).toMatch(/Angebot-AN-\d{4}-001\.pdf/)
  })
  it('Vorlage: Angebot statt Rechnung, Positionen, Summen, Gültigkeit, kein Zahlungs-QR; Texte maskiert (kein HTML-Einschleusen)', async () => {
    const { quoteHtml } = await import('../../server/utils/quotePdf')
    const q = await mk({ client: '<b>Fett</b> & Co', title: '<script>alert(1)</script>', intro: '<img src=x onerror=1>' }); const html = await quoteHtml(rawQuote(q.quoteId), { branding: { brandName: 'Päffgen IT', primaryColor: '#123456' }, company: { street: 'Weg 1' }, invoiceSettings: { vatRate: 19, smallBusiness: false } }, 'https://app.plexora.eu/angebot/x')
    expect(html).toContain('>Angebot<'); expect(html).not.toMatch(/Rechnung|Fälligkeit|qr/i); expect(html).toContain('Website Paket 450 EUR'); expect(html).toMatch(/535,50/); expect(html).toContain('Gültig bis'); expect(html).toContain('https://app.plexora.eu/angebot/x')
    expect(html).not.toContain('<script>alert'); expect(html).not.toContain('<img src=x'); expect(html).toContain('&lt;b&gt;Fett'); expect(html).toContain('#123456')
  })
})
