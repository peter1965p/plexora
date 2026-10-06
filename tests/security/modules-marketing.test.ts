import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calls, rows, reset, fakeClient, resolveFake, anon, tok, status, writes, everything, setup } from './demoHarness'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeClient() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveFake(e), invalidateTenantCache: () => {} }))
vi.mock('../../server/utils/campaignAppointments', () => ({ createCampaignAppointmentType: async () => null, defaultCampaignEnd: () => '2027-01-01T00:00:00.000Z', findCampaignAppointmentTypeId: async () => '' }))
vi.mock('../../server/utils/drafts/context', () => ({ deleteOwnDraftQuietly: async () => {} }))
const ai = { calls: 0 }
vi.mock('../../server/utils/marketingEmail', () => ({
  resolveAnthropicApiKey: async () => { ai.calls++; return '' },
  generateEmailContent: async () => { ai.calls++; return {} },
  buildEmailHtml: () => '',
}))
setup()
const routes = import.meta.glob('../../server/api/**/*.ts')
const load = async (rel: string): Promise<any> => ((await routes[`../../server/api/${rel}.ts`]()) as any).default
beforeEach(() => { reset(); ai.calls = 0 })

describe('Modul Marketing', () => {
  it('Kampagne anlegen: ohne Token 401; Demo-Login schreibt unter demo@plexora.eu; Team im Mandanten des Inhabers', async () => {
    const h = await load('marketing/index.post')
    expect(await status(h(anon()))).toBe(401); expect(calls).toHaveLength(0)
    await h(tok('demo@plexora.eu', { body: { name: 'K', formId: 'f1', appointmentEnabled: false } }))
    expect(writes()[0].input.Item.userId).toBe('demo@plexora.eu'); expect(everything()).not.toContain('"demo-user"')
    reset()
    await h(tok('maria@firma.de', { body: { name: 'K', formId: 'f1', appointmentEnabled: false, userId: 'fremd@andere.de' } }))
    expect(writes()[0].input.Item.userId).toBe('chef@firma.de')
  })
  it('Kampagnen lesen (Demo-Login-Test): ohne Token 401, Demo-Login sieht nur seine Kampagnen', async () => {
    const h = await load('marketing/index.get')
    expect(await status(h(anon()))).toBe(401)
    rows['plexora-marketing'] = [{ userId: 'demo-user', marker: 'anonym', created: '1' }, { userId: 'demo@plexora.eu', marker: 'demo-login', created: '2' }, { userId: 'chef@firma.de', marker: 'echt', created: '3' }]
    const res: any = await h(tok('demo@plexora.eu'))
    expect((Object.values(res).find(Array.isArray) as any[]).map(x => x.marker)).toEqual(['demo-login'])
  })
  it('KI-Vorschau: ohne Token 401, Demo-Konto 403 – in beiden Fällen weder Datenbank noch KI', async () => {
    const h = await load('marketing/[id]/preview-email.post')
    expect(await status(h({ ...anon(), params: { id: 'c1' } }))).toBe(401)
    expect(await status(h(tok('demo@plexora.eu', { params: { id: 'c1' }, body: {} })))).toBe(403)
    expect(await status(h(tok('x@y.de', { params: { id: 'c1' }, body: {} }, ['demo'])))).toBe(403)
    expect(calls).toHaveLength(0); expect(ai.calls).toBe(0)
  })
  it('KI-Vorschau: Team-Mitglied wird im Mandanten des Inhabers bedient, Fremdmandant findet die Kampagne nicht', async () => {
    const h = await load('marketing/[id]/preview-email.post')
    rows['plexora-marketing'] = [{ userId: 'chef@firma.de', campaignId: 'c1' }]
    expect(await status(h(tok('fremd@andere.de', { params: { id: 'c1' }, body: {} })))).toBe(404)
    expect(await status(h(tok('maria@firma.de', { params: { id: 'c1' }, body: {} })))).not.toBe(404)
  })
})
