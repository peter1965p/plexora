import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

// ── Fakes ────────────────────────────────────────────────────────────────────────────────
const sent: any[] = []            // alle über Resend verschickten Mails
const writes: string[] = []       // alle Schreibzugriffe (Tabelle:Befehl)
const db = {
  finance: [] as any[],           // plexora-finance
  marketing: [] as any[],         // plexora-marketing
  contacts: [] as any[],          // plexora-contacts
}
vi.mock('resend', () => ({
  Resend: class { emails = { send: async (m: any) => { sent.push(m); return { data: { id: 'x' }, error: null } } } },
}))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input
      if (['PutCommand', 'UpdateCommand', 'DeleteCommand'].includes(n)) writes.push(`${i.TableName}:${n}`)
      if (n === 'ScanCommand' && i.TableName === 'plexora-finance')
        return { Items: db.finance.filter(x => x.invoiceId === i.ExpressionAttributeValues[':id']) }
      if (n === 'QueryCommand' && i.TableName === 'plexora-marketing')
        return { Items: db.marketing.filter(x => x.userId === i.ExpressionAttributeValues[':uid'] && x.campaignId === i.ExpressionAttributeValues[':cid']) }
      if (n === 'QueryCommand' && i.TableName === 'plexora-contacts')
        return { Items: db.contacts.filter(x => x.userId === i.ExpressionAttributeValues[':uid']) }
      return {}                    // Settings/Templates: nicht vorhanden -> Standardwerte
    },
  }),
}))
vi.mock('../../server/utils/tenant', () => ({
  resolveUserId: async (e: string) => ({ 'maria@firma.de': 'chef@firma.de' } as Record<string, string>)[e] || e,
}))
vi.mock('../../server/utils/invoiceTemplate', () => ({ renderInvoiceTemplateToPdf: async () => Buffer.from('pdf') }))
vi.mock('../../server/utils/invoicePresets', () => ({ getPresetHtml: () => '<html></html>' }))
vi.mock('../../server/utils/marketingEmail', () => ({
  generateEmailContent: async () => 'KI-Text', resolveAnthropicApiKey: async () => '',
  buildEmailHtml: () => '<p>x</p>', replacePlaceholders: (t: string) => t, textToHtmlParagraphs: (t: string) => `<p>${t}</p>`,
}))
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 'k', anthropicApiKey: '' }))

const { default: sendInvoice } = await import('../../server/api/finance/[id]/send.post')
const { default: dunning } = await import('../../server/api/finance/[id]/dunning.post')
const { default: sendCampaign } = await import('../../server/api/marketing/[id]/send-email.post')
const { validRecipient, isDemoAccount, DEMO_ACCOUNT_EMAIL } = await import('../../server/utils/mailGuard')

const owner = { userId: 'sub-chef', email: 'chef@firma.de', groups: ['admins'] }
const team = { userId: 'sub-maria', email: 'maria@firma.de', groups: ['customers'] }
const stranger = { userId: 'sub-x', email: 'fremd@andere.de', groups: ['customers'] }
const demo = { userId: 'sub-demo', email: DEMO_ACCOUNT_EMAIL, groups: ['customers'] }
const ev = (auth: any, id: string, body: any = {}) => ({ context: { auth }, params: { id }, body })
const status = (p: Promise<any>) => p.then(() => 200, (e: any) => e.statusCode)

beforeEach(() => {
  sent.length = 0; writes.length = 0
  db.finance = [
    { userId: 'chef@firma.de', invoiceId: 'inv-1', number: 'R-1', client: 'Kunde', clientEmail: 'kunde@kunde.de', amount: 100, dueDate: '2026-01-01' },
    { userId: 'chef@firma.de', invoiceId: 'inv-bad', number: 'R-2', client: 'K', clientEmail: 'a@b.de,evil@x.de', amount: 10, dueDate: '2026-01-01' },
    { userId: 'chef@firma.de', invoiceId: 'inv-none', number: 'R-3', client: 'K', clientEmail: '', amount: 10, dueDate: '2026-01-01' },
    { userId: 'demo-user', invoiceId: 'inv-demo', number: 'D-1', client: 'X', clientEmail: 'opfer@fremd.de', amount: 1, dueDate: '2026-01-01' },
  ]
  db.marketing = [{ userId: 'chef@firma.de', campaignId: 'camp-1', name: 'K', headline: 'H' }, { userId: 'demo-user', campaignId: 'camp-demo', name: 'D' }]
  db.contacts = [
    { userId: 'chef@firma.de', contactId: 'c1', email: 'kontakt1@firma.de', firstName: 'A', status: 'lead' },
    { userId: 'demo-user', contactId: 'd1', email: 'opfer@fremd.de', firstName: 'O', status: 'lead' },
  ]
})

describe('Ohne Anmeldung (der Angriffsweg aus dem Bericht)', () => {
  it('Rechnung per demo-user anlegen und versenden: 401, keine Mail, kein Schreibzugriff', async () => {
    expect(await status(sendInvoice(ev(undefined, 'inv-demo', { toEmail: 'opfer@fremd.de' }) as any))).toBe(401)
    expect(await status(dunning(ev(undefined, 'inv-demo', { level: 1 }) as any))).toBe(401)
    expect(sent).toEqual([]); expect(writes).toEqual([])
  })
  it('Kampagnenversand an selbst angelegte demo-user-Kontakte: 401, keine Mail', async () => {
    expect(await status(sendCampaign(ev(undefined, 'camp-demo', { mode: 'manual', manualSubject: 'Spam', manualBody: 'x' }) as any))).toBe(401)
    expect(sent).toEqual([]); expect(writes).toEqual([])
  })
  it('auch ein Token ohne E-Mail/Nutzer-ID wird abgelehnt', async () => {
    expect(await status(sendInvoice(ev({ userId: '', email: '', groups: [] }, 'inv-1') as any))).toBe(401)
  })
})

describe('Demo-Konto (Zugangsdaten sind öffentlich)', () => {
  it('darf keine Mails auslösen (403), auch nicht an eigene Daten', async () => {
    expect(await status(sendInvoice(ev(demo, 'inv-1') as any))).toBe(403)
    expect(await status(dunning(ev(demo, 'inv-1', { level: 1 }) as any))).toBe(403)
    expect(await status(sendCampaign(ev(demo, 'camp-1', { mode: 'manual' }) as any))).toBe(403)
    expect(sent).toEqual([])
  })
  it('wird am Token erkannt (E-Mail oder Gruppe), nicht an Body-Werten', () => {
    expect(isDemoAccount({ email: 'DEMO@plexora.eu', groups: [] })).toBe(true)
    expect(isDemoAccount({ email: 'x@y.de', groups: ['demo'] })).toBe(true)
    expect(isDemoAccount({ email: 'chef@firma.de', groups: ['admins'] })).toBe(false)
  })
})

describe('Besitzerprüfung', () => {
  it('Fremder Tenant: 403 bei Rechnung und Mahnung, 404 bei Kampagne, keine Mail', async () => {
    expect(await status(sendInvoice(ev(stranger, 'inv-1') as any))).toBe(403)
    expect(await status(dunning(ev(stranger, 'inv-1', { level: 1 }) as any))).toBe(403)
    expect(await status(sendCampaign(ev(stranger, 'camp-1', { mode: 'manual' }) as any))).toBe(404)
    expect(sent).toEqual([])
  })
  it('Angemeldeter Nutzer kann nicht die demo-user-Daten versenden', async () => {
    expect(await status(sendInvoice(ev(owner, 'inv-demo') as any))).toBe(403)
    expect(await status(sendCampaign(ev(owner, 'camp-demo', { mode: 'manual' }) as any))).toBe(404)
    expect(sent).toEqual([])
  })
  it('Team-Mitglied wird dem Mandanten des Chefs zugeordnet und darf senden', async () => {
    expect(await status(sendInvoice(ev(team, 'inv-1') as any))).toBe(200)
    expect(sent.map(m => m.to)).toEqual(['kunde@kunde.de'])
  })
})

describe('Empfänger nur aus den Daten des Mandanten', () => {
  it('Rechnung: body.toEmail wird ignoriert', async () => {
    expect(await status(sendInvoice(ev(owner, 'inv-1', { toEmail: 'fremd@evil.test' }) as any))).toBe(200)
    expect(sent.map(m => m.to)).toEqual(['kunde@kunde.de'])
  })
  it('Rechnung ohne gültige Adresse oder mit mehreren Adressen: 422, keine Mail, kein Status-Update', async () => {
    expect(await status(sendInvoice(ev(owner, 'inv-none') as any))).toBe(422)
    expect(await status(sendInvoice(ev(owner, 'inv-bad') as any))).toBe(422)
    expect(sent).toEqual([]); expect(writes).toEqual([])
  })
  it('Mahnung geht an die Adresse der Rechnung; ungültige Stufe = 400', async () => {
    expect(await status(dunning(ev(owner, 'inv-1', { level: 1, toEmail: 'fremd@evil.test' }) as any))).toBe(200)
    expect(sent.map(m => m.to)).toEqual(['kunde@kunde.de'])
    sent.length = 0
    expect(await status(dunning(ev(owner, 'inv-1', { level: 99 }) as any))).toBe(400)
    expect(sent).toEqual([])
  })
  it('Mahnung mit mehreren Adressen im Feld verschickt nichts an die Zusatzadresse', async () => {
    await dunning(ev(owner, 'inv-bad', { level: 1 }) as any)
    expect(sent).toEqual([])
  })
  it('Kampagne: nur Kontakte des eigenen Mandanten, auch wenn der Body etwas anderes nahelegt', async () => {
    const res: any = await sendCampaign(ev(owner, 'camp-1', { mode: 'manual', manualSubject: 'Hallo', manualBody: 'Text', to: 'fremd@evil.test', contactFilter: { status: 'lead' } }) as any)
    expect(sent.map(m => m.to)).toEqual(['kontakt1@firma.de'])
    expect(res.sent).toBe(1)
  })
})

describe('validRecipient', () => {
  it('akzeptiert genau eine Adresse', () => { expect(validRecipient(' a@b.de ')).toBe('a@b.de') })
  it('lehnt Mehrfach-, Anzeigenamen-, Zeilenumbruch- und Leerwerte ab', () => {
    for (const bad of ['a@b.de,c@d.de', 'a@b.de;c@d.de', 'Name <a@b.de>', 'a@b.de\nBcc: x@y.de', '', '   ', 'kein-at', null, undefined, 42, 'a@b', 'a@b.de '.repeat(60)])
      expect(validRecipient(bad as any), String(bad)).toBeNull()
  })
})

describe('Reihenfolge im Quellcode: Anmeldung vor jedem Datenzugriff', () => {
  for (const f of ['server/api/finance/[id]/send.post.ts', 'server/api/finance/[id]/dunning.post.ts', 'server/api/marketing/[id]/send-email.post.ts']) {
    it(f, () => {
      const src = readFileSync(f, 'utf8')
      const guard = src.indexOf('requireMailSender(event)')
      expect(guard).toBeGreaterThan(-1)
      expect(guard).toBeLessThan(src.indexOf('dynamo.send'))
      expect(src).not.toContain("|| 'demo-user'")
    })
  }
})
