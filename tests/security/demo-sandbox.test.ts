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
    const set = /SET (.*?)(?: ADD | REMOVE |$)/.exec(ex)?.[1]; const add = /ADD (\w+) (:\w+)/.exec(ex); const rem = /REMOVE (\w+)/.exec(ex)?.[1]
    if (set) for (const p of set.split(',')) { const [l, r] = p.split('=').map(s => s.trim()); row[l] = v[r] }
    if (add) row[add[1]] = (row[add[1]] || 0) + v[add[2]]
    if (rem) delete row[rem]
    tbl(t).set(k, row); return { Attributes: structuredClone(row) }
  }
  return {}
} }) }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
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
    expect((await demoResetIfIdle()).reason).toBe('noch in Benutzung')
    tbl('plexora-settings').get([...tbl('plexora-settings').keys()].find(k => k.startsWith('demo-state'))!).lastWriteAt = new Date(Date.now() - 31 * 60_000).toISOString()
    tbl('plexora-settings').get([...tbl('plexora-settings').keys()].find(k => k.startsWith('demo-state'))!).resettingAt = new Date().toISOString()
    expect((await demoResetIfIdle()).reason).toBe('läuft schon')
    delete tbl('plexora-settings').get([...tbl('plexora-settings').keys()].find(k => k.startsWith('demo-state'))!).resettingAt
    expect((await demoResetIfIdle()).reset).toBe(true); expect(find('plexora-contacts', r => r.contactId === 'c3')).toBeUndefined()
  })
  it('Route: nur das Demo-Konto, ohne Anmeldung 401, andere Konten 403', async () => {
    seed(); await saveDemoSnapshot()
    const ev = (auth: any) => ({ context: { auth } })
    expect((await H.reset(ev(DEMO))).reset).toBe(false)                       // nichts verändert
    await expect(H.reset(ev(CHEF))).rejects.toMatchObject({ statusCode: 403 }); await expect(H.reset(ev(undefined))).rejects.toMatchObject({ statusCode: 401 })
  })
})
