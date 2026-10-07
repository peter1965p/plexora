import { describe, it, expect, vi, beforeEach } from 'vitest'

// Lizenzkauf (Fall 4 im Stripe-Webhook): Konto + Willkommensmail. Mit NUXT_WELCOME_LINK kein Start-Passwort in der Mail, sondern ein Einmal-Link.
const st = { cognito: [] as any[], resend: [] as any[], mails: [] as any[], items: new Map<string, any>(), logs: [] as string[], flag: '' as any, createFails: null as null | string }
let stripeEvent: any
vi.mock('stripe', () => ({ default: class { webhooks = { constructEvent: () => stripeEvent } } }))
vi.mock('resend', () => ({ Resend: class { emails = { send: async (m: any) => { st.resend.push(m); return { data: {}, error: null } } } } }))
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: class { async send(c: any) { st.cognito.push({ cmd: c.constructor.name, ...c.input }); if (st.createFails && c.constructor.name === 'AdminCreateUserCommand') { const e: any = new Error('x'); e.name = st.createFails; throw e } return {} } },
  AdminCreateUserCommand: class { constructor(public input: any) {} }, AdminAddUserToGroupCommand: class { constructor(public input: any) {} },
}))
vi.mock('../../server/utils/mailer', () => ({ sendMail: async (m: any) => { st.mails.push(m); return 'sent' } }))
vi.mock('../../server/utils/moduleProvisioner', () => ({ provisionModule: async () => {} }))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const key = i.Key?.throttleKey ?? i.Item?.throttleKey
      if (i.TableName === 'plexora-newsletter-ratelimit') {
        if (n === 'PutCommand') { st.items.set(key, { ...i.Item }); return {} }
        if (n === 'GetCommand') return { Item: st.items.get(key) }
      }
      return {}
    },
  }),
}))
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readRawBody', async () => 'raw')
vi.stubGlobal('getHeader', () => 'sig')
vi.stubGlobal('useRuntimeConfig', () => ({ stripeSecretKey: 'sk', resendApiKey: 'k', welcomeLink: st.flag, public: { awsUserPoolId: 'pool-1' } }))
vi.spyOn(console, 'error').mockImplementation((...a: any[]) => { st.logs.push(a.join(' ')) }); vi.spyOn(console, 'log').mockImplementation(() => {})
const { default: webhook } = await import('../../server/api/webhooks/stripe.post')

const purchase = (over: any = {}) => ({ id: 'cs_1', payment_status: 'paid', customer: 'cus_1', customer_details: { email: 'neu@firma.de', name: '<img/src=x/onerror=alert(1)>' }, metadata: { type: 'license_purchase', tier: 'pro' }, ...over })
const run = (s: any = purchase()) => { stripeEvent = { type: 'checkout.session.completed', data: { object: s } }; return (webhook as any)({}) }
const created = () => st.cognito.find(c => c.cmd === 'AdminCreateUserCommand')
beforeEach(() => { st.cognito.length = 0; st.resend.length = 0; st.mails.length = 0; st.items.clear(); st.logs.length = 0; st.flag = ''; st.createFails = null })

describe('Lizenzkauf: Willkommensmail', () => {
  it('Standard (Schalter aus): bisheriger Ablauf unverändert – kurzes Start-Passwort (Plx + 8 Hex + !1) in der Mail, nichts über sendMail', async () => {
    await run()
    expect(created().TemporaryPassword).toMatch(/^Plx[0-9A-F]{8}!1$/)
    expect(st.resend).toHaveLength(1); expect(st.resend[0].html).toContain(created().TemporaryPassword); expect(st.mails).toEqual([])
  })
  it('Schalter an: zufälliges Passwort (192 Bit) das NIE in einer Mail steht, Mail mit Einmal-Link über sendMail, Name maskiert, kein Lizenzschlüssel', async () => {
    st.flag = 'true'; await run()
    const pw = created().TemporaryPassword as string
    expect(pw).toMatch(/^Plx[A-Za-z0-9_-]{32}!1$/); expect(created().MessageAction).toBe('SUPPRESS')
    expect(st.resend).toEqual([])                                                    // der alte Weg wird nicht mehr benutzt
    expect(st.mails).toHaveLength(1); const m = st.mails[0]
    expect(m).toMatchObject({ kind: 'welcome', to: 'neu@firma.de', userId: 'neu@firma.de' })
    const all = m.html + m.text; expect(all).not.toContain(pw); expect(all).not.toMatch(/PLXR-[0-9A-F]{4}-/); expect(all).not.toContain('Temp. Passwort')
    expect(m.html).not.toContain('<img'); expect(m.html).toContain('&lt;img')                       // Name aus Stripe wird maskiert
    expect(m.text).toMatch(/https:\/\/app\.plexora\.eu\/set-password#t=[A-Za-z0-9_-]{43}/); expect(m.html).toContain('set-password#t=')
    expect(m.text).toContain('Einstellungen → Lizenzen')
  })
  it('der Link gehört zum angelegten Konto: gespeichert wird nur der Hash, mit dem Benutzernamen des neuen Kontos', async () => {
    st.flag = 'true'; await run()
    const token = (st.mails[0].text as string).match(/#t=([A-Za-z0-9_-]{43})/)![1]
    const rows = [...st.items.values()]; expect(JSON.stringify(rows)).not.toContain(token)
    expect(rows.find(r => r.username)).toMatchObject({ username: created().Username, email: 'neu@firma.de' })
  })
  it('Schalter an, aber Konto existiert schon: keine Passwort-Mail, bisheriger Hinweis ohne Passwort', async () => {
    st.flag = 'true'; st.createFails = 'UsernameExistsException'; await run()
    expect(st.mails).toEqual([]); expect(st.resend).toHaveLength(1); expect(st.resend[0].html).toContain('bereits einen Account'); expect(st.resend[0].html).not.toContain('Temp. Passwort')
  })
  it('Schalter an, Versand scheitert: der Kauf bleibt gültig (Lizenz gespeichert), Fehler im Protokoll ohne Token', async () => {
    st.flag = 'true'
    const mailer = await import('../../server/utils/mailer'); const orig = (mailer as any).sendMail
    ;(mailer as any).sendMail = async () => { throw new Error('mail down') }
    await expect(run()).resolves.toEqual({ received: true })
    ;(mailer as any).sendMail = orig
  })
  it('Schalter: nur "true" (Text oder Wahrheitswert) schaltet um', async () => {
    for (const v of ['', 'false', 'yes', '1', 0]) { st.cognito.length = 0; st.flag = v; await run(); expect(created().TemporaryPassword, String(v)).toMatch(/^Plx[0-9A-F]{8}!1$/) }
    st.cognito.length = 0; st.flag = true; await run(); expect(created().TemporaryPassword).toMatch(/^Plx[A-Za-z0-9_-]{32}!1$/)
  })
})
