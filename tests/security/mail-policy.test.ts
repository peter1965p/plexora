import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { installGlobals, authEv, code } from '../botprotection/helpers'

// ── Fakes ──────────────────────────────────────────────────────────────────
const resendCalls: any[] = []
vi.mock('resend', () => ({ Resend: class { emails = { send: async (m: any) => { resendCalls.push(m); return { data: { id: 'x' }, error: null } } } } }))
const store = { bookings: [] as any[], tenants: {} as Record<string, any>, writes: [] as any[], campaigns: [] as any[], logs: [] as any[] }
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const t = i.TableName
      if (['PutCommand', 'UpdateCommand', 'DeleteCommand'].includes(n)) { store.writes.push({ n, t, i }); if (t === 'plexora-mail-log' && n === 'PutCommand') store.logs.push(i.Item) }
      if (t === 'plexora-newsletter-ratelimit') return { Attributes: { count: 1 } }
      if (t === 'plexora-termine-bookings' && n === 'ScanCommand') return { Items: store.bookings.filter(b => b.reminderSentAt === undefined) }
      if (t === 'plexora-nexora' && n === 'GetCommand') return { Item: store.tenants[i.Key.tenantId] }
      if (t === 'plexora-campaigns' && n === 'ScanCommand') return { Items: store.campaigns }
      return {}
    },
  }),
}))
vi.mock('../../server/utils/notifications', () => ({ notifySystem: async () => {} }))
installGlobals()
vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 're_test', public: { apiBase: 'https://api.example' }, newsletterCronSecret: 's' }))

const { mailBlockReason, isDemoOwner, DEMO_OWNER_IDS, DEMO_TENANT_IDS } = await import('../../server/utils/mailPolicy')
const { sendMail } = await import('../../server/utils/mailer')
const { sendDueTerminReminders } = await import('../../server/utils/termineReminders')
const { sendAutomationEmail } = await import('../../server/utils/newsletterAutomation')
const { default: signup } = await import('../../server/api/public/[tenantId]/newsletter/signup.post')
const { default: apply } = await import('../../server/api/jobs/[id]/apply.post')

beforeEach(() => { resendCalls.length = 0; store.bookings = []; store.tenants = {}; store.writes = []; store.campaigns = []; store.logs = [] })
const MAIL = { kind: 'automation' as const, from: 'a <a@plexora.eu>', to: 'x@example.com', subject: 'Hallo', html: '<p>x</p>' }

describe('mailBlockReason', () => {
  it('Demo-Kennungen (auch andere Schreibweise) und Demo-Mandant sind gesperrt', () => {
    for (const id of [...DEMO_OWNER_IDS, 'DEMO@Plexora.eu', ' demo-user ', ...DEMO_TENANT_IDS]) expect(mailBlockReason(id), id).toBe('demo')
    expect(isDemoOwner('demo@plexora.eu')).toBe(true)
  })
  it('gesperrte Mandanten (Status nicht active, mailBlocked) sind gesperrt, normale nicht', () => {
    expect(mailBlockReason('chef@firma.de', { status: 'suspended' })).toBe('tenant_inactive')
    expect(mailBlockReason('chef@firma.de', { status: 'active', mailBlocked: true })).toBe('mail_blocked')
    expect(mailBlockReason('chef@firma.de', { tenantId: 'PLXR-DEMO-0000-0000-DEMO', status: 'active' })).toBe('demo')
    expect(mailBlockReason('chef@firma.de', { email: 'demo@plexora.eu', status: 'active' })).toBe('demo')
    expect(mailBlockReason('chef@firma.de', { status: 'active' })).toBeNull()
    expect(mailBlockReason('chef@firma.de')).toBeNull()
  })
})

describe('sendMail (zentral, alle Pfade über Resend)', () => {
  it('Demo-Besitzer: kein Resend-Aufruf, Ergebnis skipped, Protokolleintrag ohne Empfängeradresse', async () => {
    for (const id of DEMO_OWNER_IDS) expect(await sendMail({ ...MAIL, userId: id })).toBe('skipped')
    expect(resendCalls).toHaveLength(0)
    expect(store.logs).toHaveLength(3); expect(store.logs.every(l => l.status === 'skipped' && l.to === '(nicht gesendet)')).toBe(true)
  })
  it('echter Mandant: wird gesendet', async () => {
    expect(await sendMail({ ...MAIL, userId: 'chef@firma.de' })).toBe('sent')
    expect(resendCalls).toHaveLength(1)
  })
})

describe('Cron: Termin-Erinnerungen über alle Mandanten', () => {
  const soon = () => { const d = new Date(Date.now() + 30 * 60_000); return { date: d.toISOString().slice(0, 10), startTime: d.toISOString().slice(11, 16) } }
  const booking = (tenantId: string) => ({ tenantId, bookingId: 'b-' + tenantId, status: 'confirmed', customerEmail: 'kunde@example.com', customerName: 'K', typeName: 'T', createdAt: '2026-01-01T00:00:00Z', ...soon() })
  it('Demo-Mandant und gesperrter Mandant bekommen keine Erinnerung (keine Mail, keine Markierung); ein echter Mandant schon', async () => {
    store.tenants = {
      'PLXR-DEMO-0000-0000-DEMO': { tenantId: 'PLXR-DEMO-0000-0000-DEMO', email: 'demo@plexora.eu', status: 'active', termineTimezone: 'UTC' },
      'T-GESPERRT': { tenantId: 'T-GESPERRT', email: 'x@firma.de', status: 'suspended', termineTimezone: 'UTC' },
      'T-ECHT': { tenantId: 'T-ECHT', email: 'chef@firma.de', status: 'active', termineTimezone: 'UTC' },
    }
    store.bookings = [booking('PLXR-DEMO-0000-0000-DEMO'), booking('T-GESPERRT')]
    await sendDueTerminReminders()
    expect(resendCalls).toHaveLength(0); expect(store.writes.filter(w => w.t === 'plexora-termine-bookings')).toHaveLength(0)
    store.bookings = [booking('T-ECHT')]
    await sendDueTerminReminders()
    expect(resendCalls).toHaveLength(1)
  })
})

describe('Cron: Newsletter-Automation', () => {
  it('Demo-Mandant: kein Versand', async () => {
    expect(await sendAutomationEmail('PLXR-DEMO-0000-0000-DEMO', { email: 'x@example.com', unsubscribeToken: 't' }, 'tpl')).toBe(false)
    expect(await sendAutomationEmail('demo@plexora.eu', { email: 'x@example.com', unsubscribeToken: 't' }, 'tpl')).toBe(false)
    expect(resendCalls).toHaveLength(0)
  })
})

describe('Öffentliche Newsletter-Anmeldung', () => {
  const ev = (tenantId: string) => ({ headers: { 'x-forwarded-for': '198.51.100.9' }, params: { tenantId }, body: { email: 'neu@example.com' }, query: {}, context: {} })
  it('Demo-, gesperrter oder unbekannter Mandant: gleiche Antwort wie sonst, aber keine Mail und kein Abonnent', async () => {
    store.tenants = { 'PLXR-DEMO-0000-0000-DEMO': { tenantId: 'PLXR-DEMO-0000-0000-DEMO', status: 'active' }, 'T-GESPERRT': { tenantId: 'T-GESPERRT', status: 'suspended' } }
    for (const id of ['PLXR-DEMO-0000-0000-DEMO', 'T-GESPERRT', 'T-GIBTS-NICHT']) expect(await (signup as any)(ev(id))).toEqual({ success: true })
    expect(resendCalls).toHaveLength(0); expect(store.writes.filter(w => w.t === 'plexora-newsletter-subscribers')).toHaveLength(0)
  })
  it('aktiver echter Mandant: Bestätigungsmail wird verschickt', async () => {
    store.tenants = { 'T-ECHT': { tenantId: 'T-ECHT', status: 'active' } }
    await (signup as any)(ev('T-ECHT'))
    expect(resendCalls).toHaveLength(1)
  })
})

describe('Bewerbungsbestätigung', () => {
  it('Stelle eines Demo-Mandanten: keine Mail', async () => {
    store.campaigns = [{ campaignId: 'c1', userId: 'demo@plexora.eu', title: 'Stelle' }]
    await (apply as any)({ headers: { 'x-forwarded-for': '198.51.100.8' }, params: { id: 'c1' }, body: { firstName: 'A', lastName: 'B', email: 'a@example.com' }, query: {}, context: {} })
    expect(resendCalls).toHaveLength(0)
  })
})

describe('Angemeldete Versandrouten: Demo-Konto 403, bevor etwas passiert', () => {
  const ROUTES = ['newsletter/campaigns/[id]/send.post', 'newsletter/campaigns/[id]/test-send.post', 'newsletter/subscribers/import.post', 'shop/purchase-orders/index.post', 'marketing/run-followups.post']
  const mods = import.meta.glob('../../server/api/**/*.ts')
  for (const r of ROUTES) it(r, async () => {
    const h: any = ((await mods[`../../server/api/${r}.ts`]()) as any).default
    expect(await code(h({ headers: {}, context: {}, params: { id: 'x' }, body: {}, query: {} }))).toBe(401)
    expect(await code(h(authEv('demo@plexora.eu', { params: { id: 'x' }, body: {} })))).toBe(403)
    expect(resendCalls).toHaveLength(0); expect(store.writes).toHaveLength(0)
  })
})

describe('Neue Versandstelle ohne Entscheidung lässt den Test durchfallen', () => {
  // Jede Datei, die Resend direkt aufruft, braucht hier einen Eintrag mit Begründung
  const DIRECT_SEND: Record<string, string> = {
    'server/utils/mailer.ts': 'zentraler Versand, prüft mailBlockReason',
    'server/utils/newsletterAutomation.ts': 'Cron: mailBlockReason',
    'server/api/public/[tenantId]/newsletter/signup.post.ts': 'öffentlich: Mandant muss existieren, aktiv und kein Demo sein',
    'server/api/jobs/[id]/apply.post.ts': 'öffentlich: mailBlockReason auf die Stelle',
    'server/api/shop/webhook/index.post.ts': 'Stripe-Webhook: mailBlockReason auf den Verkäufer',
    'server/api/finance/[id]/send.post.ts': 'angemeldet: requireMailSender',
    'server/api/finance/[id]/dunning.post.ts': 'angemeldet: requireMailSender',
    'server/api/finance/batch-dunning.post.ts': 'angemeldet: requireAdmin',
    'server/api/marketing/[id]/send-email.post.ts': 'angemeldet: requireMailSender',
    'server/api/marketing/run-followups.post.ts': 'angemeldet: requireMailSender',
    'server/api/newsletter/campaigns/[id]/send.post.ts': 'angemeldet: requireMailSender',
    'server/api/newsletter/campaigns/[id]/test-send.post.ts': 'angemeldet: requireMailSender',
    'server/api/newsletter/subscribers/import.post.ts': 'angemeldet: requireMailSender',
    'server/api/shop/purchase-orders/index.post.ts': 'angemeldet: requireMailSender',
    'server/api/webhooks/stripe.post.ts': 'Stripe-Webhook mit Signaturprüfung: Mail an Käufer von Plattform-Produkten',
    'server/utils/moduleProvisioner.ts': 'aus dem Stripe-Webhook (Plattform-Kauf)',
  }
  const files: string[] = []
  const walk = (d: string) => { for (const n of readdirSync(d)) { const f = join(d, n); statSync(f).isDirectory() ? walk(f) : f.endsWith('.ts') && files.push(f.replace(/\\/g, '/')) } }
  walk('server')
  const senders = files.filter(f => /(emails|batch)\.send\(/.test(readFileSync(f, "utf8")))
  it('jede Datei mit direktem Resend-Aufruf steht in der Liste (und umgekehrt)', () => {
    expect(senders.filter(f => !(f in DIRECT_SEND)), 'neue Versandstelle: Ausschlussregel/Anmeldung einbauen und hier mit Begründung eintragen').toEqual([])
    expect(Object.keys(DIRECT_SEND).filter(f => !senders.includes(f)), 'Eintrag ohne Versandstelle entfernen').toEqual([])
  })
  it('Dateien mit "angemeldet: requireMailSender" rufen requireMailSender wirklich auf; mit mailBlockReason ebenso', () => {
    for (const [f, why] of Object.entries(DIRECT_SEND)) {
      const src = readFileSync(f, 'utf8')
      if (why.includes('requireMailSender')) expect(src, f).toContain('requireMailSender(')
      if (why.includes('mailBlockReason')) expect(src, f).toContain('mailBlockReason(')
      if (why.includes('requireAdmin')) expect(src, f).toContain('requireAdmin(')
    }
  })
})
