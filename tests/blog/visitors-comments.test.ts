import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

// ── Fakes: DynamoDB (Put/Get/Delete/Query/Update mit den hier genutzten Bedingungen), Mail, Benachrichtigung ──
const T = new Map<string, Map<string, any>>()
const tbl = (n: string) => { if (!T.has(n)) T.set(n, new Map()); return T.get(n)! }
const KEYS: Record<string, string[]> = { 'plexora-nexora': ['tenantId'], 'plexora-site-visitors': ['tenantId', 'sk'], 'plexora-blog-comments': ['tenantId', 'commentId'], 'plexora-blog': ['tenantId', 'postId'], 'plexora-newsletter-ratelimit': ['throttleKey'] }
const keyOf = (n: string, k: any) => (KEYS[n] || Object.keys(k)).map(a => k[a]).join('|')
const st = { mails: [] as any[], notes: [] as any[] }
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
const names = (i: any, s: string) => s.replace(/#\w+/g, m => i.ExpressionAttributeNames?.[m] ?? m)
function filterOk(item: any, i: any) {
  if (!i.FilterExpression) return true
  return names(i, i.FilterExpression).split(' AND ').every(part => { const [l, r] = part.split(' = ').map(x => x.trim()); return item[l] === i.ExpressionAttributeValues[r] })
}
const fail = () => { const e: any = new Error('c'); e.name = 'ConditionalCheckFailedException'; throw e }
const fakeDb = { async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input, t = tbl(i.TableName)
  if (c === 'PutCommand') { const k = keyOf(i.TableName, i.Item); if (i.ConditionExpression?.startsWith('attribute_not_exists') && t.has(k)) fail(); t.set(k, structuredClone(i.Item)); return {} }
  if (c === 'GetCommand') { const r = t.get(keyOf(i.TableName, i.Key)); return { Item: r ? structuredClone(r) : undefined } }
  if (c === 'DeleteCommand') { const k = keyOf(i.TableName, i.Key), old = t.get(k); if (i.ConditionExpression?.startsWith('attribute_exists') && !old) fail(); t.delete(k); return i.ReturnValues === 'ALL_OLD' ? { Attributes: old ? structuredClone(old) : undefined } : {} }
  if (c === 'QueryCommand') return { Items: [...t.values()].filter(x => x.tenantId === i.ExpressionAttributeValues[':t'] && filterOk(x, i)).map(x => structuredClone(x)) }
  if (c === 'UpdateCommand') {
    const k = keyOf(i.TableName, i.Key), cur = t.get(k), v = i.ExpressionAttributeValues || {}
    if (i.TableName === 'plexora-newsletter-ratelimit') { const row = cur || {}; row.count = (row.count || 0) + 1; t.set(k, row); return { Attributes: { ...row } } }
    if (i.ConditionExpression?.startsWith('attribute_exists') && !cur) fail()
    const row = { ...(cur || {}) }
    const [setPart, removePart] = names(i, String(i.UpdateExpression)).replace(/^SET /, '').split(' REMOVE ')
    for (const a of setPart.split(',')) { const [l, r] = a.split('=').map(s => s.trim()); row[l] = v[r] }
    for (const r of (removePart || '').split(',').map(x => x.trim()).filter(Boolean)) delete row[r]
    t.set(k, row); return { Attributes: { ...row } }
  }
  return {}
} }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDb }))
vi.mock('../../server/utils/mailer', () => ({ sendMail: async (m: any) => { st.mails.push(m); return 'sent' } }))
vi.mock('../../server/utils/notifications', () => ({ notifySystem: async (n: any) => { st.notes.push(n) } }))
vi.mock('../../server/utils/auth', () => ({ requireTenantId: async (e: any) => { if (!e.context.auth?.email) throw new HttpError({ statusCode: 401, message: 'x' }); return e.context.auth.email === 'chef@firma.de' ? 'T-A' : 'T-B' } }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('getQuery', (e: any) => e.query || {})
vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
vi.stubGlobal('setResponseHeaders', () => {}); vi.stubGlobal('setResponseHeader', () => {})
vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {})

const H: Record<string, any> = {}
beforeAll(async () => {
  const V = '../../server/api/public/[tenantId]/visitor/'
  for (const n of ['register', 'verify', 'login', 'forgot', 'reset', 'me', 'logout', 'delete-account']) H[n] = (await import(`${V}${n}.post`)).default
  H.cGet = (await import('../../server/api/public/[tenantId]/blog/[slug]/comments.get')).default
  H.cPost = (await import('../../server/api/public/[tenantId]/blog/[slug]/comments.post')).default
  H.aList = (await import('../../server/api/blog/comments.get')).default; H.aPatch = (await import('../../server/api/blog/comments/[id].patch')).default; H.aDel = (await import('../../server/api/blog/comments/[id].delete')).default
  H.sGet = (await import('../../server/api/blog/comments-settings.get')).default; H.sPost = (await import('../../server/api/blog/comments-settings.post')).default
})
let ipN = 0
const pub = (tenantId: string, body?: any, extra: any = {}) => ({ context: {}, params: { tenantId, ...extra }, body, headers: { 'x-forwarded-for': `198.51.100.${(++ipN % 250) + 1}` } })
const adm = (email: string | null, body?: any, params: any = {}, query: any = {}) => ({ context: { auth: email ? { userId: 'u', email, groups: ['customers'] } : undefined }, params, body, query, headers: {} })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number, msg: x.message } } }
const PW = 'Sehr-sicheres-Geheimnis-7', NEW_PW = 'Noch-sicherer-Schluessel-9'
const lastToken = () => { const m = /token=([A-Za-z0-9_-]+)/.exec(st.mails[st.mails.length - 1]?.text || ''); return m ? m[1] : '' }
const setMode = (tenant: string, mode: any) => { tbl('plexora-nexora').get(tenant)!.blogCommentsMode = mode }
const register = (tenant = 'T-A', over: any = {}) => call(H.register, pub(tenant, { name: 'Anna Muster', email: 'anna@beispiel.de', password: PW, ...over }))
const registered = async (tenant = 'T-A', email = 'anna@beispiel.de') => { await register(tenant, { email }); const r = await call(H.verify, pub(tenant, { token: lastToken() })); return r.res.token as string }

beforeEach(() => {
  T.clear(); st.mails.length = 0; st.notes.length = 0
  for (const id of ['T-A', 'T-B']) tbl('plexora-nexora').set(id, { tenantId: id, status: 'active', blogEnabled: true, companyName: 'Firma ' + id, email: id === 'T-A' ? 'chef@firma.de' : 'fremd@firma.de', customDomain: id === 'T-A' ? 'www.firma-a.de' : '', blogCommentsMode: 'open' })
  tbl('plexora-blog').set('T-A|p1', { tenantId: 'T-A', postId: 'p1', slug: 'hallo', title: 'Hallo Welt', status: 'published' })
  tbl('plexora-blog').set('T-A|p2', { tenantId: 'T-A', postId: 'p2', slug: 'still', title: 'Still', status: 'published', commentsEnabled: false })
  tbl('plexora-blog').set('T-B|q1', { tenantId: 'T-B', postId: 'q1', slug: 'hallo', title: 'Fremd', status: 'published' })
})

describe('Registrieren und Bestätigen', () => {
  it('ohne aktivierte Kommentare keine Registrierung (403); unbekannter oder inaktiver Mandant: 404', async () => {
    setMode('T-A', 'off'); expect((await register()).code).toBe(403)
    expect((await register('T-Z')).code).toBe(404); tbl('plexora-nexora').get('T-B')!.status = 'inactive'; expect((await register('T-B')).code).toBe(404)
    expect((await register('../x')).code).toBe(404); expect(st.mails).toHaveLength(0)
  })
  it('schickt eine Bestätigungsmail an die Adresse mit Link auf die Webseite des Mandanten; das Konto ist noch gesperrt', async () => {
    const r = await register(); expect(r.code).toBe(200)
    expect(st.mails).toHaveLength(1); expect(st.mails[0]).toMatchObject({ to: 'anna@beispiel.de', kind: 'visitor_account' })
    expect(st.mails[0].text).toContain('https://www.firma-a.de/konto/bestaetigen?t=T-A&token=')
    expect((await call(H.login, pub('T-A', { email: 'anna@beispiel.de', password: PW }))).code).toBe(401)      // unbestätigt
    const acct = tbl('plexora-site-visitors').get('T-A|acct#anna@beispiel.de')!
    expect(acct.passwordHash).toMatch(/^s1\$/); expect(JSON.stringify(acct)).not.toContain(PW)
  })
  it('schwache Eingaben: 400 mit Meldung, keine Mail', async () => {
    for (const o of [{ password: 'kurz' }, { email: 'kaputt' }, { name: 'A' }]) expect((await register('T-A', o)).code).toBe(400)
    expect(st.mails).toHaveLength(0)
  })
  it('Bestätigen: genau einmal, meldet an; falscher Token, falsche Art und abgelaufener Token scheitern', async () => {
    await register(); const tok = lastToken()
    const r = await call(H.verify, pub('T-A', { token: tok })); expect(r.code).toBe(200); expect(r.res.token.length).toBeGreaterThan(30); expect(r.res.name).toBe('Anna Muster')
    expect((await call(H.verify, pub('T-A', { token: tok }))).code).toBe(400)                    // zweiter Versuch
    expect((await call(H.verify, pub('T-A', { token: 'x'.repeat(40) }))).code).toBe(400)
    expect((await call(H.verify, pub('T-A', {}))).code).toBe(400)
    await call(H.forgot, pub('T-A', { email: 'anna@beispiel.de' })); const reset = lastToken()
    expect((await call(H.verify, pub('T-A', { token: reset }))).code).toBe(400)                  // Passwort-Token ist kein Bestätigungs-Token
    await register('T-A', { email: 'bert@beispiel.de' }); const old = lastToken()
    for (const [k, v] of tbl('plexora-site-visitors')) if (k.includes('tok#')) v.ttl = 1           // abgelaufen
    expect((await call(H.verify, pub('T-A', { token: old }))).code).toBe(400)
  })
  it('unbestätigte Konten verfallen nach 7 Tagen von selbst (ttl); mit der Bestätigung entfällt der Ablauf', async () => {
    await register(); const acct = () => tbl('plexora-site-visitors').get('T-A|acct#anna@beispiel.de')!
    const days = (acct().ttl - Math.floor(Date.now() / 1000)) / 86400; expect(days).toBeGreaterThan(6.9); expect(days).toBeLessThanOrEqual(7)
    await call(H.verify, pub('T-A', { token: lastToken() })); expect(acct().verified).toBe(true); expect(acct()).not.toHaveProperty('ttl')
  })
  it('Token eines anderen Mandanten funktioniert nicht', async () => {
    await register('T-A'); const tok = lastToken()
    expect((await call(H.verify, pub('T-B', { token: tok }))).code).toBe(400)
  })
  it('bereits bestätigte Adresse: gleiche Antwort, keine zweite Mail, Konto bleibt unverändert (keine Übernahme)', async () => {
    await registered(); const n = st.mails.length
    const r = await register('T-A', { name: 'Angreifer', password: 'Ganz-anderer-Schluessel-5' })
    expect(r.code).toBe(200); expect(st.mails.length).toBe(n)
    expect(tbl('plexora-site-visitors').get('T-A|acct#anna@beispiel.de')!.name).toBe('Anna Muster')
    expect((await call(H.login, pub('T-A', { email: 'anna@beispiel.de', password: PW }))).code).toBe(200)
  })
  it('höchstens 3 Bestätigungsmails je Adresse und Stunde (Mail-Schleuder verhindern)', async () => {
    for (let n = 0; n < 6; n++) await register()
    expect(st.mails.length).toBe(3)
  })
})

describe('Anmelden, Sitzung, Abmelden', () => {
  it('Anmeldung nur mit richtigem Passwort; die Fehlermeldung verrät nichts über Konten', async () => {
    await registered()
    const wrong = await call(H.login, pub('T-A', { email: 'anna@beispiel.de', password: 'falsches-Passwort-1' })), none = await call(H.login, pub('T-A', { email: 'niemand@beispiel.de', password: PW }))
    expect(wrong.code).toBe(401); expect(none.code).toBe(401); expect(wrong.msg).toBe(none.msg)
    const ok = await call(H.login, pub('T-A', { email: 'ANNA@beispiel.de ', password: PW })); expect(ok.code).toBe(200); expect(ok.res).toMatchObject({ ok: true, name: 'Anna Muster' })
  })
  it('Drosselung: zu viele Fehlversuche je Adresse ergeben 429', async () => {
    await registered()
    const codes: number[] = []; for (let n = 0; n < 12; n++) codes.push((await call(H.login, pub('T-A', { email: 'anna@beispiel.de', password: 'falsch-falsch-' + n }))).code)
    expect(codes.slice(0, 10).every(c => c === 401)).toBe(true); expect(codes.slice(10)).toEqual([429, 429])
  })
  it('me prüft die Sitzung; Abmelden beendet sie; Sitzungen sind je Mandant getrennt', async () => {
    const tok = await registered()
    expect((await call(H.me, pub('T-A', { token: tok }))).res).toMatchObject({ ok: true, name: 'Anna Muster' })
    expect((await call(H.me, pub('T-B', { token: tok }))).code).toBe(401)
    expect((await call(H.me, pub('T-A', { token: 'x'.repeat(40) }))).code).toBe(401); expect((await call(H.me, pub('T-A', {}))).code).toBe(401)
    expect((await call(H.logout, pub('T-A', { token: tok }))).code).toBe(200)
    expect((await call(H.me, pub('T-A', { token: tok }))).code).toBe(401)
  })
  it('abgelaufene Sitzung ist ungültig', async () => {
    const tok = await registered()
    for (const [k, v] of tbl('plexora-site-visitors')) if (k.includes('sess#')) v.ttl = 1
    expect((await call(H.me, pub('T-A', { token: tok }))).code).toBe(401)
  })
})

describe('Passwort vergessen', () => {
  it('immer dieselbe Antwort; Mail nur bei bestätigtem Konto; Reset gilt einmal, beendet alte Sitzungen und ersetzt das Passwort', async () => {
    const sess = await registered(); const n = st.mails.length
    const known = await call(H.forgot, pub('T-A', { email: 'anna@beispiel.de' })), unknown = await call(H.forgot, pub('T-A', { email: 'niemand@beispiel.de' }))
    expect(known.res).toEqual(unknown.res); expect(st.mails.length).toBe(n + 1)
    const tok = lastToken(); expect(st.mails[st.mails.length - 1].text).toContain('/konto/passwort?t=T-A&token=')
    const weak = await call(H.reset, pub('T-A', { token: tok, password: 'kurz' })); expect(weak.code).toBe(400)              // schwaches Passwort verbraucht den Link nicht
    expect((await call(H.reset, pub('T-A', { token: tok, password: NEW_PW }))).code).toBe(200)
    expect((await call(H.reset, pub('T-A', { token: tok, password: NEW_PW + 'x' }))).code).toBe(400)                         // Link nur einmal
    expect((await call(H.me, pub('T-A', { token: sess }))).code).toBe(401)                                                    // alte Sitzung beendet
    expect((await call(H.login, pub('T-A', { email: 'anna@beispiel.de', password: PW }))).code).toBe(401)
    expect((await call(H.login, pub('T-A', { email: 'anna@beispiel.de', password: NEW_PW }))).code).toBe(200)
  })
  it('unbestätigtes Konto bekommt keine Reset-Mail', async () => { await register(); const n = st.mails.length; await call(H.forgot, pub('T-A', { email: 'anna@beispiel.de' })); expect(st.mails.length).toBe(n) })
})

describe('Kommentare', () => {
  it('ohne Anmeldung 401; ausgeschaltet 403; Beitrag ohne Kommentare 403; unbekannter Beitrag 404', async () => {
    expect((await call(H.cPost, pub('T-A', { text: 'Hallo zusammen' }, { slug: 'hallo' }))).code).toBe(401)
    const tok = await registered()
    expect((await call(H.cPost, pub('T-A', { token: tok, text: 'Hallo zusammen' }, { slug: 'still' }))).code).toBe(403)
    expect((await call(H.cPost, pub('T-A', { token: tok, text: 'Hallo zusammen' }, { slug: 'gibtsnicht' }))).code).toBe(404)
    setMode('T-A', 'off'); expect((await call(H.cPost, pub('T-A', { token: tok, text: 'Hallo zusammen' }, { slug: 'hallo' }))).code).toBe(403)
    expect((await call(H.cGet, pub('T-A', undefined, { slug: 'hallo' }))).res).toEqual({ mode: 'off', comments: [] })
  })
  it('Modus "open": sofort sichtbar, ohne E-Mail-Adresse in der Ausgabe; Name aus dem Konto, nicht aus der Anfrage', async () => {
    const tok = await registered()
    const r = await call(H.cPost, pub('T-A', { token: tok, text: 'Toller Beitrag!', name: 'Fälscher', authorName: 'Fälscher', authorEmail: 'x@y.de', status: 'approved' }, { slug: 'hallo' }))
    expect(r.code).toBe(200); expect(r.res.status).toBe('approved')
    const list = (await call(H.cGet, pub('T-A', undefined, { slug: 'hallo' }))).res
    expect(list.mode).toBe('open'); expect(list.comments).toHaveLength(1); expect(list.comments[0]).toMatchObject({ name: 'Anna Muster', text: 'Toller Beitrag!' })
    expect(JSON.stringify(list)).not.toContain('beispiel.de'); expect(Object.keys(list.comments[0]).sort()).toEqual(['commentId', 'created', 'name', 'text'])
  })
  it('Modus "moderated": erst nach Freigabe sichtbar, der Inhaber wird benachrichtigt', async () => {
    setMode('T-A', 'moderated'); const tok = await registered()
    const r = await call(H.cPost, pub('T-A', { token: tok, text: 'Wartet auf Freigabe' }, { slug: 'hallo' })); expect(r.res.status).toBe('pending')
    expect((await call(H.cGet, pub('T-A', undefined, { slug: 'hallo' }))).res.comments).toEqual([])
    expect(st.notes).toHaveLength(1); expect(st.notes[0]).toMatchObject({ userId: 'chef@firma.de', type: 'blog_comment' })
    const id = [...tbl('plexora-blog-comments').values()][0].commentId
    expect((await call(H.aPatch, adm('chef@firma.de', { status: 'approved' }, { id }))).code).toBe(200)
    expect((await call(H.cGet, pub('T-A', undefined, { slug: 'hallo' }))).res.comments).toHaveLength(1)
  })
  it('Text wird geprüft (Länge, Links); Falle (Honeypot) speichert nichts; HTML bleibt Text', async () => {
    const tok = await registered()
    expect((await call(H.cPost, pub('T-A', { token: tok, text: 'x' }, { slug: 'hallo' }))).code).toBe(400)
    expect((await call(H.cPost, pub('T-A', { token: tok, text: 'Schau https://a.de https://b.de https://c.de' }, { slug: 'hallo' }))).code).toBe(400)
    const bot = await call(H.cPost, pub('T-A', { token: tok, text: 'Ich bin ein Bot', website: 'http://spam.de' }, { slug: 'hallo' })); expect(bot.code).toBe(200)
    expect(tbl('plexora-blog-comments').size).toBe(0)
    expect((await call(H.cPost, pub('T-A', { token: tok, text: '<img src=x onerror=alert(1)> hallo' }, { slug: 'hallo' }))).code).toBe(200)
    expect([...tbl('plexora-blog-comments').values()][0].text).toBe('<img src=x onerror=alert(1)> hallo')      // gespeichert als Text; die Webseite zeigt ihn nur als Text
  })
  it('Drosselung: nicht öfter als einmal in 15 Sekunden', async () => {
    const tok = await registered()
    expect((await call(H.cPost, pub('T-A', { token: tok, text: 'Erster Kommentar' }, { slug: 'hallo' }))).code).toBe(200)
    expect((await call(H.cPost, pub('T-A', { token: tok, text: 'Zweiter sofort' }, { slug: 'hallo' }))).code).toBe(429)
  })
  it('Kommentare eines anderen Mandanten oder Beitrags erscheinen nicht', async () => {
    const tokA = await registered('T-A'), tokB = await registered('T-B', 'bert@beispiel.de')
    await call(H.cPost, pub('T-A', { token: tokA, text: 'Kommentar bei A' }, { slug: 'hallo' })); await call(H.cPost, pub('T-B', { token: tokB, text: 'Kommentar bei B' }, { slug: 'hallo' }))
    expect((await call(H.cGet, pub('T-A', undefined, { slug: 'hallo' }))).res.comments.map((c: any) => c.text)).toEqual(['Kommentar bei A'])
    expect((await call(H.cGet, pub('T-B', undefined, { slug: 'hallo' }))).res.comments.map((c: any) => c.text)).toEqual(['Kommentar bei B'])
  })
})

describe('Konto löschen', () => {
  it('löscht Konto und eigene Kommentare; danach keine Anmeldung mehr; verlangt Anmeldung und Bestätigung', async () => {
    const tok = await registered(); await call(H.cPost, pub('T-A', { token: tok, text: 'Wird gelöscht' }, { slug: 'hallo' }))
    expect((await call(H['delete-account'], pub('T-A', { confirm: 'LOESCHEN' }))).code).toBe(401)
    expect((await call(H['delete-account'], pub('T-A', { token: tok }))).code).toBe(400)
    const r = await call(H['delete-account'], pub('T-A', { token: tok, confirm: 'LOESCHEN' })); expect(r.code).toBe(200); expect(r.res.deletedComments).toBe(1)
    expect(tbl('plexora-blog-comments').size).toBe(0)
    expect((await call(H.login, pub('T-A', { email: 'anna@beispiel.de', password: PW }))).code).toBe(401)
    expect((await call(H.me, pub('T-A', { token: tok }))).code).toBe(401)
  })
})

describe('Verwaltung (Inhaber)', () => {
  it('Einstellung: nur angemeldet; unbekannte Werte bedeuten aus; speichert für den eigenen Mandanten', async () => {
    expect((await call(H.sGet, adm(null))).code).toBe(401)
    expect((await call(H.sPost, adm('chef@firma.de', { mode: 'moderated' }))).res.mode).toBe('moderated'); expect(tbl('plexora-nexora').get('T-A')!.blogCommentsMode).toBe('moderated')
    expect(tbl('plexora-nexora').get('T-B')!.blogCommentsMode).toBe('open')                                                     // anderer Mandant unberührt
    expect((await call(H.sPost, adm('chef@firma.de', { mode: 'hack' }))).res.mode).toBe('off')
    expect((await call(H.sGet, adm('chef@firma.de'))).res.mode).toBe('off')
    expect((await call(H.sPost, adm('demo@plexora.eu', { mode: 'open' }))).code).toBe(403)
  })
  it('Liste, Freigeben, Verbergen, Löschen: nur im eigenen Mandanten; Status wird geprüft', async () => {
    const tokA = await registered('T-A'), tokB = await registered('T-B', 'bert@beispiel.de')
    await call(H.cPost, pub('T-A', { token: tokA, text: 'Kommentar bei A' }, { slug: 'hallo' })); await call(H.cPost, pub('T-B', { token: tokB, text: 'Kommentar bei B' }, { slug: 'hallo' }))
    const own = (await call(H.aList, adm('chef@firma.de'))).res.comments; expect(own).toHaveLength(1); expect(own[0].authorEmail).toBe('anna@beispiel.de'); expect(own[0]).not.toHaveProperty('tenantId')
    const idA = own[0].commentId, idB = (await call(H.aList, adm('fremd@firma.de'))).res.comments[0].commentId
    expect((await call(H.aPatch, adm('chef@firma.de', { status: 'hidden' }, { id: idB }))).code).toBe(404)                      // fremder Kommentar
    expect((await call(H.aPatch, adm('chef@firma.de', { status: 'wirres' }, { id: idA }))).code).toBe(400)
    expect((await call(H.aPatch, adm('chef@firma.de', { status: 'hidden' }, { id: idA }))).code).toBe(200)
    expect((await call(H.cGet, pub('T-A', undefined, { slug: 'hallo' }))).res.comments).toEqual([])                              // verborgen
    expect((await call(H.aList, adm('chef@firma.de', undefined, {}, { status: 'hidden' }))).res.comments).toHaveLength(1)
    await call(H.aDel, adm('chef@firma.de', undefined, { id: idB }))                                                             // fremder Kommentar: löscht nichts
    expect((await call(H.aList, adm('fremd@firma.de'))).res.comments).toHaveLength(1)
    expect((await call(H.aDel, adm('demo@plexora.eu', undefined, { id: idA }))).code).toBe(403)
    expect((await call(H.aDel, adm('chef@firma.de', undefined, { id: idA }))).code).toBe(200)
    expect((await call(H.aList, adm('chef@firma.de'))).res.comments).toEqual([])
  })
})
