import { describe, it, expect, vi } from 'vitest'
import { installGlobals } from '../botprotection/helpers'

let enforce: any = 'true'
let tokenResult: any = null
vi.mock('../../server/utils/verifyAuth', () => ({ verifyBearerToken: async () => tokenResult }))
installGlobals()
vi.stubGlobal('useRuntimeConfig', () => ({ authEnforce: enforce }))
const { default: mw } = await import('../../server/middleware/auth')

const ev = (path: string, method = 'GET') => ({ path, method, context: {} as any, headers: {} })
const run = async (path: string, method = 'GET', token: any = null, enf: any = 'true') => {
  enforce = enf; tokenResult = token
  const e = ev(path, method)
  try { await (mw as any)(e); return { status: 200, e } } catch (x: any) { return { status: x.statusCode, e } }
}
const USER = { userId: 's', email: 'chef@firma.de', groups: ['customers'] }

describe('NUXT_AUTH_ENFORCE=true: ungültiges oder fehlendes Token ergibt 401, öffentliche Abläufe bleiben offen', () => {
  it('geschützte Route ohne Token / mit ungültigem oder abgelaufenem Token (verifyBearerToken liefert null): 401', async () => {
    for (const p of ['/api/contacts', '/api/finance', '/api/settings/invoice', '/api/team/members', '/api/team/accept', '/api/team/invite-preview', '/api/hr/stempel', '/api/marketing/abc/preview-email'])
      expect((await run(p)).status, p).toBe(401)
  })
  it('geschützte Route mit gültigem Token: durch, Nutzer im Kontext', async () => {
    const r = await run('/api/contacts', 'GET', USER)
    expect(r.status).toBe(200); expect(r.e.context.auth).toEqual(USER)
  })
  it('öffentliche Abläufe ohne Token: Landingpage, Lead-Formular, Buchung, Newsletter, Webhooks, Cron, Rechtstexte', async () => {
    for (const [p, m] of [
      ['/api/marketing/public/abc', 'GET'], ['/api/forms/f1/submit', 'POST'], ['/api/public/T1/termine/book', 'POST'], ['/api/public/T1/contact', 'POST'],
      ['/api/public/T1/newsletter/signup', 'POST'], ['/api/public/newsletter/confirm/tok', 'GET'], ['/api/webhooks/stripe', 'POST'], ['/api/webhooks/resend', 'POST'],
      ['/api/shop/webhook', 'POST'], ['/api/termine/cron/reminders', 'POST'], ['/api/newsletter/cron/run-automations', 'POST'], ['/api/sequences/cron/sweep', 'POST'],
      ['/api/settings/agb', 'GET'], ['/api/settings/datenschutz', 'GET'], ['/api/settings/branding', 'GET'], ['/api/settings/company', 'GET'], ['/api/pages/start', 'GET'],
      ['/api/jobs/x', 'GET'], ['/api/pay/inv1', 'GET'], ['/api/support/portal/tok', 'GET'], ['/api/termine/google-callback', 'GET'],
      ['/api/analytics/vitals', 'POST'], ['/api/licenses/PLXR-AAAA', 'GET'], ['/api/licenses/checkout', 'POST'],
    ] as const) expect((await run(p, m)).status, `${m} ${p}`).toBe(200)
  })
  it('öffentliche Route mit ungültigem Token bleibt erreichbar (kein 401 für Besucher mit abgelaufener Sitzung)', async () => {
    expect((await run('/api/settings/company', 'GET', null)).status).toBe(200)
    expect((await run('/api/pages/start', 'GET', null)).status).toBe(200)
  })
  it('optionales Token wird bei Seiten/Firmendaten gelesen (Entwürfe des Besitzers), bei reinen Besucher-Routen nicht', async () => {
    expect((await run('/api/pages/start', 'GET', USER)).e.context.auth).toEqual(USER)
    expect((await run('/api/settings/company', 'GET', USER)).e.context.auth).toEqual(USER)
    expect((await run('/api/marketing/public/abc', 'GET', USER)).e.context.auth).toBeUndefined()
  })
  it('Methode zählt: Schreiben auf eine nur lesend öffentliche Route braucht ein Token', async () => {
    expect((await run('/api/settings/agb', 'POST')).status).toBe(401)
    expect((await run('/api/pages/start', 'PUT')).status).toBe(401)
    expect((await run('/api/settings/company', 'POST')).status).toBe(401)
  })
})

describe('Ohne Schalter (Rückweg)', () => {
  it('NUXT_AUTH_ENFORCE nicht gesetzt: Middleware lehnt nichts ab (die Routen selbst verlangen weiter die Anmeldung)', async () => {
    expect((await run('/api/contacts', 'GET', null, '')).status).toBe(200)
  })
})
