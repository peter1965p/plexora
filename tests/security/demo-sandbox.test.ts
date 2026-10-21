import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { isDemoWriteAllowed, DEMO_WRITE_LIMIT, resetTables, RESET_EXCLUDE, DEMO_TENANT_ID, saveDemoSnapshot, resetDemo, demoResetIfIdle, getDemoState } from '../../server/utils/demoSandbox'
import { assertNotDemo } from '../../server/utils/demoPolicy'
import { DEMO_ACCOUNT_EMAIL } from '../../server/utils/mailGuard'

// ── Fake-DynamoDB: Tabellen im Speicher, Schlüsselnamen je Tabelle, einfache Update-Ausdrücke ──
const T = new Map<string, Map<string, any>>()
const KEYS: Record<string, string[]> = { 'plexora-settings': ['settingId', 'scope'], 'plexora-branch-records': ['tenantId', 'sk'], 'plexora-finance': ['userId', 'invoiceId'], 'plexora-contacts': ['userId', 'contactId'] }
const keysOf = (t: string) => KEYS[t] || ['userId', 'id']
const tbl = (n: string) => { if (!T.has(n)) T.set(n, new Map()); return T.get(n)! }
const kstr = (t: string, o: any) => keysOf(t).map(k => String(o[k])).join('|')
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
const calls: string[] = []
const put = (t: string, row: any) => { tbl(t).set(kstr(t, row), row); return row }
const rows = (t: string) => [...tbl(t).values()]
const find = (t: string, f: (r: any) => boolean) => rows(t).find(f)
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input, t = i.TableName
  if (c === 'DescribeTableCommand') return { Table: { KeySchema: keysOf(t).map(k => ({ AttributeName: k })) } }
  if (c === 'GetCommand') return { Item: tbl(t).get(kstr(t, i.Key)) ? structuredClone(tbl(t).get(kstr(t, i.Key))) : undefined }
  if (c === 'PutCommand') { calls.push(`put ${t}`); tbl(t).set(kstr(t, i.Item), structuredClone(i.Item)); return {} }
  if (c === 'DeleteCommand') { calls.push(`del ${t}`); tbl(t).delete(kstr(t, i.Key)); return {} }
  if (c === 'QueryCommand' || c === 'ScanCommand') { const a = Object.values(i.ExpressionAttributeNames || {})[0] as string, v = Object.values(i.ExpressionAttributeValues || {})[0]; return { Items: [...tbl(t).values()].filter(x => x[a] === v).map(x => structuredClone(x)) } }
  if (c === 'UpdateCommand') {
    const k = kstr(t, i.Key), row = tbl(t).get(k) || { ...i.Key }; const v = i.ExpressionAttributeValues || {}; const ex: string = i.UpdateExpression
    if (i.ConditionExpression?.includes('leasedAt') && row.leasedAt !== undefined && !(row.leasedAt < v[':c'])) throw Object.assign(new Error('cond'), { name: 'ConditionalCheckFailedException' })
    const set = /SET (.*?)(?: ADD | REMOVE |$)/.exec(ex)?.[1]; const add = /ADD (\w+) (:\w+)/.exec(ex); const rem = /REMOVE (.+)$/.exec(ex)?.[1]
    if (set) for (const p of set.split(',')) { const [l, r] = p.split('=').map(s => s.trim()); row[l] = v[r] }
    if (add) row[add[1]] = (row[add[1]] || 0) + v[add[2]]
    if (rem) for (const r of rem.split(',')) delete row[r.trim()]
    tbl(t).set(k, row); return { Attributes: structuredClone(row) }
  }
  return {}
} }) }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
const H: Record<string, any> = {}
beforeAll(async () => { H.mw = (await import('../../server/middleware/demo')).default; H.reset = (await import('../../server/api/demo/reset.post')).default })
beforeEach(() => { T.clear(); calls.length = 0 })
const DEMO = { userId: 'd', email: DEMO_ACCOUNT_EMAIL, groups: ['customers'] }, CHEF = { userId: 'c', email: 'chef@firma.de', groups: ['customers'] }
const mw = async (path: string, method: string, auth: any = { ...DEMO }) => { if (auth === null) auth = undefined; const e: any = { path, method, context: { auth } }; try { await H.mw(e); return { code: 200, sandbox: !!e.context.auth?.demoSandbox } } catch (x: any) { return { code: x.statusCode as number, sandbox: false } } }

describe('Demo-Sandkasten: Erlaubnisliste', () => {
  it('Lesen immer, Schreiben nur in den freigegebenen Bereichen', () => {
    for (const [m, p] of [['GET', '/api/aws/dynamo'], ['POST', '/api/contacts'], ['PUT', '/api/deals/x'], ['DELETE', '/api/finance/x'], ['POST', '/api/finance'], ['POST', '/api/finance/incoming'], ['POST', '/api/quotes'], ['POST', '/api/branchen/fitness/mitglieder'], ['PUT', '/api/projects/x/schedule'], ['POST', '/api/fewo/units'], ['POST', '/api/gastro-orders'], ['POST', '/api/settings/company'], ['POST', '/api/settings/invoice'], ['POST', '/api/demo/reset'], ['PATCH', '/api/support/x']])
      expect(isDemoWriteAllowed(m, p), `${m} ${p}`).toBe(true)
  })
  it('gesperrt: Blog, Lead-Seiten, Website, Marketing, Newsletter, Mail, Uploads, KI, Zahlung, Team, Sicherung, Store, Lizenzen, AWS, Einstellungen mit Sicherheitsbezug', () => {
    for (const [m, p] of [['POST', '/api/blog'], ['PUT', '/api/blog/x'], ['POST', '/api/pages'], ['PUT', '/api/nexora/my'], ['POST', '/api/marketing'], ['POST', '/api/marketing/x/send-email'], ['POST', '/api/campaigns'], ['POST', '/api/newsletter/campaigns/x/send'], ['POST', '/api/aws/s3-upload'], ['POST', '/api/ai/assistant/execute'],
      ['POST', '/api/settings/payment'], ['POST', '/api/settings/bot-protection'], ['POST', '/api/settings/ai-providers'], ['POST', '/api/settings/branch-packages'], ['POST', '/api/settings/session'], ['POST', '/api/settings/account'], ['POST', '/api/settings/landing-theme'], ['POST', '/api/team/invite'], ['PATCH', '/api/team/x@y.de'], ['POST', '/api/backup/jobs'], ['POST', '/api/store/checkout'], ['POST', '/api/licenses'], ['POST', '/api/aws/s3-delete'], ['POST', '/api/admin/data-integrity/migrate'], ['POST', '/api/plugins/x/data'], ['POST', '/api/auth/set-password'], ['POST', '/api/billing/portal'], ['POST', '/api/demo/other'], ['POST', '/api/unbekannt']])
      expect(isDemoWriteAllowed(m, p), `${m} ${p}`).toBe(false)
  })
  it('innerhalb freigegebener Bereiche bleibt gesperrt, was Mails, Abrufe oder Links auslöst', () => {
    for (const [m, p] of [['POST', '/api/finance/i-1/send'], ['POST', '/api/finance/i-1/dunning'], ['POST', '/api/finance/batch-dunning'], ['POST', '/api/quotes/q1/send'], ['POST', '/api/shop/purchase-orders'], ['PUT', '/api/termine/bookings/b1'], ['POST', '/api/fewo/units/u/feeds'], ['POST', '/api/fewo/units/u/sync'], ['POST', '/api/fewo/units/u/export-token'], ['POST', '/api/termine/ical-token']])
      expect(isDemoWriteAllowed(m, p), `${m} ${p}`).toBe(false)
  })
  it('Pfade werden an der Segmentgrenze geprüft (kein Schlupfloch über ähnliche Namen)', () => {
    for (const p of ['/api/contactsX', '/api/finance-x', '/api/hrx/leave', '/api/settings/companyX', '/api/settings/company/x', '/api/branchenx/y', '/api//api/contacts']) expect(isDemoWriteAllowed('POST', p), p).toBe(false)
  })
})

describe('Demo-Sandkasten: Middleware', () => {
  it('Demo darf erlaubt schreiben (Sandkasten-Kennzeichen, als verändert vermerkt) und wird sonst mit 403 gestoppt', async () => {
    expect(await mw('/api/contacts', 'POST')).toEqual({ code: 200, sandbox: true })
    expect((await getDemoState()).dirty).toBe(true)
    expect((await mw('/api/blog', 'POST')).code).toBe(403)
    expect((await mw('/api/aws/s3-upload', 'POST')).code).toBe(403)
    expect((await mw('/api/contacts', 'GET')).sandbox).toBe(false)           // Lesen braucht kein Kennzeichen
  })
  it('andere Konten und öffentliche Routen sind unberührt', async () => {
    expect(await mw('/api/blog', 'POST', { ...CHEF })).toEqual({ code: 200, sandbox: false })
    expect(await mw('/api/public/abc/newsletter/signup', 'POST')).toEqual({ code: 200, sandbox: false })
    expect(await mw('/api/blog', 'POST', null)).toEqual({ code: 200, sandbox: false })
    expect((await getDemoState()).dirty).toBeUndefined()
  })
  it('Missbrauchsbremse: nach dem Limit 429 bis zum Zurücksetzen', async () => {
    for (let n = 0; n < DEMO_WRITE_LIMIT; n++) expect((await mw('/api/contacts', 'POST')).code).toBe(200)
    expect((await mw('/api/contacts', 'POST')).code).toBe(429)
  })
  it('assertNotDemo: im Sandkasten frei, sonst für Demo gesperrt, für andere Konten nie', () => {
    expect(() => assertNotDemo({ ...DEMO })).toThrow(); expect(() => assertNotDemo({ ...DEMO, demoSandbox: true } as any)).not.toThrow(); expect(() => assertNotDemo(CHEF)).not.toThrow()
  })
})

describe('Demo-Sandkasten: Zurücksetzen', () => {
  const seed = () => {
    put('plexora-contacts', { userId: DEMO_ACCOUNT_EMAIL, contactId: 'c1', name: 'Standard 1' })
    put('plexora-contacts', { userId: DEMO_ACCOUNT_EMAIL, contactId: 'c2', name: 'Standard 2' })
    put('plexora-contacts', { userId: 'chef@firma.de', contactId: 'c9', name: 'Fremd' })
    put('plexora-branch-records', { tenantId: DEMO_TENANT_ID, sk: 'fitness#mitglieder#m1', id: 'm1', data: { name: 'Anna' } })
    put('plexora-branch-records', { tenantId: 'T-FREMD', sk: 'fitness#mitglieder#m2', id: 'm2', data: { name: 'Fremd' } })
    put('plexora-finance', { userId: DEMO_ACCOUNT_EMAIL, invoiceId: 'DEMO-1', amount: 100 })
    put('plexora-settings', { settingId: 'company', scope: DEMO_ACCOUNT_EMAIL, legalName: 'Beispiel GmbH' })
    put('plexora-settings', { settingId: 'company', scope: 'global', legalName: 'Plexora' })
    put('plexora-nexora', { tenantId: DEMO_TENANT_ID, email: DEMO_ACCOUNT_EMAIL, apiKey: 'plx_pub_geheim' })
    put('plexora-blog', { tenantId: DEMO_TENANT_ID, id: 'p1', title: 'Beitrag' })
  }
  const settingsRows = () => [...tbl('plexora-settings').values()]
  it('Tabellenliste: nur Besitzer-Tabellen, nichts Gesperrtes oder Fremdes; Besitzer-Schlüssel stimmt', () => {
    const r = resetTables(), names = r.map(x => x.table)
    for (const ex of RESET_EXCLUDE) expect(names, ex).not.toContain(ex)
    for (const must of ['plexora-contacts', 'plexora-finance', 'plexora-finance-incoming', 'plexora-branch-records', 'plexora-settings', 'plexora-fewo-units']) expect(names, must).toContain(must)
    expect(r.find(x => x.table === 'plexora-contacts')).toMatchObject({ attr: 'userId', value: DEMO_ACCOUNT_EMAIL })
    expect(r.find(x => x.table === 'plexora-branch-records')).toMatchObject({ attr: 'tenantId', value: DEMO_TENANT_ID })
    expect(r.find(x => x.table === 'plexora-fewo-units')).toMatchObject({ attr: 'tenantId', value: DEMO_TENANT_ID })      // "owner"-Tabelle mit Mandanten-Schlüssel
    expect(names.some(n => /licenses|team-members|users|nexora|blog|pages|campaign|newsletter/.test(n))).toBe(false)
  })
  it('stellt den Standard wieder her: Neues weg, Gelöschtes zurück, Geändertes zurück; Fremdes, Gesperrtes und Globales bleibt unberührt', async () => {
    seed(); const snap = await saveDemoSnapshot(); expect(snap.rows).toBe(5)           // 2 Kontakte, 1 Branchen-Eintrag, 1 Rechnung, 1 Firmen-Einstellung des Demo-Kontos
    // Besucher probiert aus
    put('plexora-contacts', { userId: DEMO_ACCOUNT_EMAIL, contactId: 'c3', name: 'Neu' })
    tbl('plexora-contacts').delete(kstr('plexora-contacts', { userId: DEMO_ACCOUNT_EMAIL, contactId: 'c1' }))
    find('plexora-contacts', r => r.contactId === 'c2')!.name = 'Geändert'
    tbl('plexora-branch-records').delete(kstr('plexora-branch-records', { tenantId: DEMO_TENANT_ID, sk: 'fitness#mitglieder#m1' }))
    find('plexora-finance', r => r.invoiceId === 'DEMO-1')!.amount = 999
    find('plexora-settings', r => r.settingId === 'company' && r.scope === DEMO_ACCOUNT_EMAIL)!.legalName = 'Hacker GmbH'
    find('plexora-contacts', r => r.contactId === 'c9')!.name = 'Fremd geändert'            // gehört nicht dem Demo-Konto: darf nicht angefasst werden
    rows('plexora-nexora')[0].apiKey = 'verändert'; rows('plexora-blog')[0].title = 'verändert'    // gesperrte Tabellen: nicht Teil des Zurücksetzens
    await mw('/api/contacts', 'POST')
    expect(await resetDemo()).toMatchObject({ reset: true })
    expect(rows('plexora-contacts').filter(x => x.userId === DEMO_ACCOUNT_EMAIL).map(x => x.name).sort()).toEqual(['Standard 1', 'Standard 2'])
    expect(find('plexora-branch-records', r => r.id === 'm1')!.data.name).toBe('Anna'); expect(find('plexora-finance', r => r.invoiceId === 'DEMO-1')!.amount).toBe(100)
    expect(find('plexora-settings', r => r.settingId === 'company' && r.scope === DEMO_ACCOUNT_EMAIL)!.legalName).toBe('Beispiel GmbH')
    expect(find('plexora-contacts', r => r.contactId === 'c9')!.name).toBe('Fremd geändert'); expect(find('plexora-branch-records', r => r.id === 'm2')!.data.name).toBe('Fremd')
    expect(find('plexora-settings', r => r.settingId === 'company' && r.scope === 'global')!.legalName).toBe('Plexora')
    expect(rows('plexora-nexora')[0].apiKey).toBe('verändert'); expect(rows('plexora-blog')[0].title).toBe('verändert')
    const st = await getDemoState(); expect(st.dirty).toBe(false); expect(st.writes).toBe(0); expect(st.resettingAt).toBeUndefined()
  })
  it('nichts zu tun, wenn nichts verändert wurde; ohne gespeicherten Standard wird NICHTS gelöscht', async () => {
    seed(); expect((await resetDemo()).reason).toBe('unverändert')
    put('plexora-contacts', { userId: DEMO_ACCOUNT_EMAIL, contactId: 'c3', name: 'Neu' }); await mw('/api/contacts', 'POST')
    const r = await resetDemo({ force: true }); expect(r).toEqual({ reset: false, reason: 'kein Standard gespeichert' })
    expect(rows('plexora-contacts').length).toBe(4)
  })
  it('unverändert zurückgesetzt: nur geänderte Zeilen werden geschrieben (kein Löschen des Standards)', async () => {
    seed(); await saveDemoSnapshot(); calls.length = 0
    put('plexora-contacts', { userId: DEMO_ACCOUNT_EMAIL, contactId: 'c3', name: 'Neu' }); await mw('/api/contacts', 'POST')
    await resetDemo({ force: true })
    expect(calls.filter(c => c.startsWith('del'))).toEqual(['del plexora-contacts']); expect(calls.filter(c => c.startsWith('put')).length).toBe(0)
  })
  it('Leerlauf: Zeitplan setzt erst zurück, wenn lange nichts geschrieben wurde; Sperre gegen doppeltes Zurücksetzen', async () => {
    seed(); await saveDemoSnapshot()
    put('plexora-contacts', { userId: DEMO_ACCOUNT_EMAIL, contactId: 'c3', name: 'Neu' }); await mw('/api/contacts', 'POST')
    expect((await resetDemo({ onlyIfIdleMinutes: 30 })).reason).toBe('noch in Benutzung'); expect((await demoResetIfIdle()).reset).toEqual([])
    tbl('plexora-settings').get([...tbl('plexora-settings').keys()].find(k => k.startsWith('demo-state'))!).lastWriteAt = new Date(Date.now() - 31 * 60_000).toISOString()
    tbl('plexora-settings').get([...tbl('plexora-settings').keys()].find(k => k.startsWith('demo-state'))!).resettingAt = new Date().toISOString()
    expect((await resetDemo({ onlyIfIdleMinutes: 30 })).reason).toBe('läuft schon')
    delete tbl('plexora-settings').get([...tbl('plexora-settings').keys()].find(k => k.startsWith('demo-state'))!).resettingAt
    expect((await demoResetIfIdle()).reset).toEqual([DEMO_ACCOUNT_EMAIL]); expect(find('plexora-contacts', r => r.contactId === 'c3')).toBeUndefined()
  })
  it('Route: nur das Demo-Konto, ohne Anmeldung 401, andere Konten 403', async () => {
    seed(); await saveDemoSnapshot()
    const ev = (auth: any) => ({ context: { auth } })
    expect((await H.reset(ev(DEMO))).reset).toBe(false)                       // nichts verändert
    await expect(H.reset(ev(CHEF))).rejects.toMatchObject({ statusCode: 403 }); await expect(H.reset(ev(undefined))).rejects.toMatchObject({ statusCode: 401 })
  })
})

// ── Pool: jedes Poolkonto hat seine eigene Kopie der Demo-Daten ──
import { DEMO_POOL, DEMO_ACCOUNTS, DEMO_BASE_EMAIL, DEMO_BASE_TENANT, demoTenantId, demoSlot, isDemoEmail, isPoolEmail } from '../../shared/demo'
import { makeTransform, leaseDemoAccount, stateKey, LEASE_MINUTES } from '../../server/utils/demoSandbox'
import { isDemoAccount } from '../../server/utils/mailGuard'
import { DEMO_TENANT_IDS, isDemoOwner, mailBlockReason } from '../../server/utils/mailPolicy'

describe('Demo-Pool: Konten und Erkennung', () => {
  it('zehn Poolkonten plus Ausgangskonto; Mandanten-IDs eindeutig; nichts Fremdes wird als Demo erkannt', () => {
    expect(DEMO_POOL.length).toBe(10); expect(DEMO_POOL[0]).toBe('demo01@plexora.eu'); expect(DEMO_POOL[9]).toBe('demo10@plexora.eu'); expect(DEMO_ACCOUNTS.length).toBe(11)
    expect(new Set(DEMO_ACCOUNTS.map(demoTenantId)).size).toBe(11); expect(demoTenantId(DEMO_BASE_EMAIL)).toBe(DEMO_BASE_TENANT); expect(demoTenantId('DEMO03@plexora.eu')).toBe('PLXR-DEMO-0000-0000-D03'); expect(demoSlot('demo07@plexora.eu')).toBe('07'); expect(demoSlot(DEMO_BASE_EMAIL)).toBe('')
    for (const bad of ['demo11@plexora.eu', 'demo00@plexora.eu', 'demo1@plexora.eu', 'demo01@plexora.eu.evil.de', 'xdemo01@plexora.eu', 'demo01@plexora.de', '', null, undefined, 'chef@firma.de']) expect(isDemoEmail(bad as any), String(bad)).toBe(false)
    for (const good of DEMO_ACCOUNTS) { expect(isDemoEmail(good)).toBe(true); expect(isDemoAccount({ email: good.toUpperCase(), groups: [] }), good).toBe(true); expect(isDemoOwner(good)).toBe(true); expect(mailBlockReason(good)).toBe('demo') }
    expect(isPoolEmail(DEMO_BASE_EMAIL)).toBe(false); for (const t of DEMO_ACCOUNTS.map(demoTenantId)) expect(DEMO_TENANT_IDS).toContain(t)
  })
  it('die Erlaubnisliste gilt für jedes Poolkonto, nicht nur für das Ausgangskonto', async () => {
    for (const email of DEMO_POOL.slice(0, 3)) {
      expect(await mw('/api/contacts', 'POST', { userId: 'x', email, groups: ['customers'] })).toEqual({ code: 200, sandbox: true })
      expect((await mw('/api/blog', 'POST', { userId: 'x', email, groups: ['customers'] })).code).toBe(403)
    }
  })
})

describe('Demo-Pool: eigene Kopie je Konto', () => {
  const tpl = (table: string, keys: string[], owner: string, rows: any[]) => ({ table, keys, owner, rows: rows.map(r => JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'number' ? { N: String(v) } : { S: String(v) }])))) })
  const TPL = [
    tpl('plexora-finance', ['userId', 'invoiceId'], 'userId', [{ userId: DEMO_BASE_EMAIL, invoiceId: 'DEMO-INV-001', client: 'Musterfirma', clientEmail: 'info@musterfirma.test', amount: 100 }]),
    tpl('plexora-contacts', ['userId', 'contactId'], 'userId', [{ userId: DEMO_BASE_EMAIL, contactId: '8f14e45f-ceea-467a-9575-1b2c3d4e5f60', name: 'Anna', quoteRef: 'DEMO-INV-001' }]),
    tpl('plexora-branch-records', ['tenantId', 'sk'], 'tenantId', [{ tenantId: DEMO_BASE_TENANT, sk: 'fitness#beitraege#demo-fitness-beitraege-1', id: 'demo-fitness-beitraege-1', mitglied: 'demo-fitness-mitglieder-1' }, { tenantId: DEMO_BASE_TENANT, sk: 'fitness#mitglieder#demo-fitness-mitglieder-1', id: 'demo-fitness-mitglieder-1' }]),
    tpl('plexora-settings', ['settingId', 'scope'], 'scope', [{ settingId: 'company', scope: DEMO_BASE_EMAIL, legalName: 'Beispiel GmbH' }]),
  ]
  it('Ausgangskonto bleibt unverändert; Poolkonto bekommt eigene E-Mail, Mandanten-ID und eindeutige Kennungen', () => {
    const base = makeTransform(TPL, DEMO_BASE_EMAIL); for (const t of TPL) for (const r of t.rows) expect(base(r)).toBe(r)
    const tr = makeTransform(TPL, 'demo04@plexora.eu')
    const fin = JSON.parse(tr(TPL[0].rows[0])), con = JSON.parse(tr(TPL[1].rows[0])), kit = TPL[2].rows.map(r => JSON.parse(tr(r))), set = JSON.parse(tr(TPL[3].rows[0]))
    expect(fin.userId.S).toBe('demo04@plexora.eu'); expect(fin.invoiceId.S).toBe('DEMO-INV-001-d04'); expect(fin.clientEmail.S).toBe('info@musterfirma.test')
    expect(con.contactId.S).toBe('8f14e45f-ceea-467a-9575-1b2c3d4e5f60-d04'); expect(con.quoteRef.S).toBe('DEMO-INV-001-d04')              // Verweis auf andere Zeile mitgeführt
    expect(kit[0].tenantId.S).toBe('PLXR-DEMO-0000-0000-D04'); expect(kit[0].sk.S).toBe('fitness#beitraege#demo-fitness-beitraege-1-d04'); expect(kit[0].mitglied.S).toBe('demo-fitness-mitglieder-1-d04'); expect(kit[1].sk.S).toBe('fitness#mitglieder#demo-fitness-mitglieder-1-d04')
    expect(set.scope.S).toBe('demo04@plexora.eu'); expect(set.settingId.S).toBe('company')                      // Einstellungsnamen sind keine Kennungen
    expect(kit[1].sk.S.endsWith('-d04') && !kit[1].sk.S.includes('d04-d04')).toBe(true)
  })
  it('keine Kennung kommt in zwei Poolkonten gleich vor (Abfragen nach Kennung verwechseln nichts)', () => {
    const idsOf = (email: string) => { const tr = makeTransform(TPL, email); return TPL.flatMap(t => t.rows.map(r => JSON.parse(tr(r)))).flatMap(r => [r.invoiceId?.S, r.contactId?.S, r.id?.S]).filter(Boolean) as string[] }
    const a = new Set(idsOf('demo01@plexora.eu')), b = idsOf('demo02@plexora.eu'); expect(b.some(x => a.has(x))).toBe(false)
    for (const email of DEMO_POOL) expect(new Set(idsOf(email)).size).toBe(idsOf(email).length)
  })
  it('Poolkonto wird beim Vergeben aus der Vorlage gefüllt und ist danach von anderen Konten getrennt; Zurücksetzen räumt NUR dieses Konto auf', async () => {
    // Vorlage speichern (Ausgangskonto)
    put('plexora-contacts', { userId: DEMO_ACCOUNT_EMAIL, contactId: 'c1', name: 'Standard 1' })
    put('plexora-finance', { userId: DEMO_ACCOUNT_EMAIL, invoiceId: 'DEMO-INV-001', amount: 100 })
    put('plexora-branch-records', { tenantId: DEMO_TENANT_ID, sk: 'fitness#mitglieder#demo-fitness-mitglieder-1', id: 'demo-fitness-mitglieder-1' })
    put('plexora-settings', { settingId: 'company', scope: DEMO_ACCOUNT_EMAIL, legalName: 'Beispiel GmbH' })
    await saveDemoSnapshot()
    const l1 = await leaseDemoAccount(); expect(l1.shared).toBe(false); expect(DEMO_POOL).toContain(l1.email)
    const mine = (t: string, attr: string, v: string) => rows(t).filter(r => r[attr] === v)
    const tenant = demoTenantId(l1.email), slot = demoSlot(l1.email)
    expect(mine('plexora-contacts', 'userId', l1.email).map(r => r.contactId)).toEqual(['c1'])       // 'c1' ist zu kurz für eine Kennung (unter 4 Zeichen) und bleibt
    expect(mine('plexora-finance', 'userId', l1.email).map(r => r.invoiceId)).toEqual([`DEMO-INV-001-d${slot}`])
    expect(mine('plexora-branch-records', 'tenantId', tenant).map(r => r.sk)).toEqual([`fitness#mitglieder#demo-fitness-mitglieder-1-d${slot}`])
    expect(mine('plexora-settings', 'scope', l1.email)[0].legalName).toBe('Beispiel GmbH')
    // zweiter Besucher bekommt ein anderes Konto
    const l2 = await leaseDemoAccount(); expect(l2.email).not.toBe(l1.email); expect(l2.shared).toBe(false)
    // Besucher 1 verändert, Besucher 2 nicht
    find('plexora-finance', r => r.userId === l1.email)!.amount = 999; await mw('/api/finance', 'POST', { userId: 'x', email: l1.email, groups: ['customers'] })
    expect(find('plexora-finance', r => r.userId === l2.email)!.amount).toBe(100); expect(find('plexora-finance', r => r.userId === DEMO_ACCOUNT_EMAIL)!.amount).toBe(100)
    // Besucher 1 meldet sich ab: eigenes Konto zurück und frei, das von Besucher 2 und das Ausgangskonto bleiben
    find('plexora-finance', r => r.userId === l2.email)!.amount = 555
    expect(await resetDemo({ email: l1.email, release: true })).toMatchObject({ reset: true })
    expect(find('plexora-finance', r => r.userId === l1.email)!.amount).toBe(100); expect(find('plexora-finance', r => r.userId === l2.email)!.amount).toBe(555)
    expect((await getDemoState(l1.email)).leasedAt).toBeUndefined(); expect((await getDemoState(l2.email)).leasedAt).toBeTruthy()
  })
  it('Vergabe: kein Konto doppelt; abgelaufene Besitzvermerke werden wieder frei; ist alles belegt, gilt das Ausgangskonto', async () => {
    put('plexora-contacts', { userId: DEMO_ACCOUNT_EMAIL, contactId: 'cont-1', name: 'S' }); await saveDemoSnapshot()
    const got = new Set<string>()
    for (let n = 0; n < 10; n++) { const l = await leaseDemoAccount(); expect(l.shared).toBe(false); expect(got.has(l.email)).toBe(false); got.add(l.email) }
    expect(got.size).toBe(10)
    const l11 = await leaseDemoAccount(); expect(l11).toEqual({ email: DEMO_BASE_EMAIL, shared: true })
    const victim = [...got][3]; tbl('plexora-settings').get(kstr('plexora-settings', stateKey(victim)))!.leasedAt = new Date(Date.now() - (LEASE_MINUTES + 1) * 60_000).toISOString()
    const again = await leaseDemoAccount(); expect(again).toEqual({ email: victim, shared: false })
  })
  it('ohne gespeicherte Vorlage wird kein Poolkonto vergeben (und nichts gelöscht)', async () => {
    const l = await leaseDemoAccount(); expect(l).toEqual({ email: DEMO_BASE_EMAIL, shared: true }); expect(rows('plexora-contacts').length).toBe(0)
    for (const email of DEMO_POOL) expect((await getDemoState(email)).leasedAt).toBeUndefined()
  })
})
