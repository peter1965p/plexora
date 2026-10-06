import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installGlobals, authEv, code } from '../botprotection/helpers'
import { PUBLIC_CAMPAIGN_FIELDS } from '../../server/utils/publicView'

const st = { campaigns: [] as any[], puts: [] as any[], updates: [] as any[] }
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const t = i.TableName
      if (t === 'plexora-marketing' && n === 'ScanCommand') { const v = Object.values(i.ExpressionAttributeValues)[0]; return { Items: st.campaigns.filter(c => c.campaignId === v || c.slug === v || c.formId === v) } }
      if (t === 'plexora-marketing' && n === 'PutCommand') { st.puts.push(i.Item); return {} }
      if (t === 'plexora-marketing' && n === 'UpdateCommand') { st.updates.push(i); return {} }
      if (t === 'plexora-marketing' && n === 'QueryCommand') return { Items: st.campaigns.filter(c => c.userId === i.ExpressionAttributeValues[':u'] || c.userId === i.ExpressionAttributeValues[':uid']), Count: 0 }
      if (t === 'plexora-forms' && n === 'ScanCommand') return { Items: [{ formId: 'f1', userId: 'chef@firma.de', notifyEmail: 'geheim@firma.de', title: 'F', fields: [] }] }
      return {}
    },
  }),
}))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => ({ 'maria@firma.de': 'chef@firma.de' } as Record<string, string>)[e] || e }))
vi.mock('../../server/utils/campaignAppointments', () => ({ createCampaignAppointmentType: async () => null, defaultCampaignEnd: () => '2027-01-01T00:00:00.000Z', findCampaignAppointmentTypeId: async () => '' }))
vi.mock('../../server/utils/drafts/context', () => ({ deleteOwnDraftQuietly: async () => {} }))
installGlobals()
const { default: create } = await import('../../server/api/marketing/index.post')
const { default: patch } = await import('../../server/api/marketing/[id].patch')
const { default: landing } = await import('../../server/api/marketing/public/[slug].get')
const { trustItemsHtml, privacyLineHtml } = await import('../../shared/leadDecor')

const OK = { trustItems: [{ icon: 'star', text: 'Persönliche Beratung', on: true }], privacyLine: { on: true, text: 'Wir behandeln deine Angaben vertraulich.' }, overlays: [{ shape: 'burst', text: '-20 %', color: '#ff0066', size: 24, rotate: -8, x: 60, y: 10, anim: 'pulse' }] }
beforeEach(() => { st.puts = []; st.updates = []; st.campaigns = [{ userId: 'chef@firma.de', campaignId: 'c1', slug: 'beratung', formId: 'f1', name: 'K', headline: 'H', headerImageUrl: 'https://x/h.jpg', customTemplateHtml: '' }] })
const mk = (email: string, body: any) => (create as any)(authEv(email, { body: { name: 'Neu', formId: 'f1', appointmentEnabled: false, ...body } }))
const pt = (email: string, body: any) => (patch as any)(authEv(email, { params: { id: 'c1' }, body: { name: 'K', formId: 'f1', ...body } }))

describe('Speichern: Prüfung, Rechte', () => {
  it('Anlegen und Ändern mit gültigen Werten speichert bereinigte Daten; ohne die Felder bleiben sie unberührt', async () => {
    await mk('chef@firma.de', OK)
    expect(st.puts[0]).toMatchObject({ trustItems: [{ icon: 'star', text: 'Persönliche Beratung' }], privacyLine: { on: true }, overlays: [{ shape: 'burst', anim: 'pulse' }] })
    await pt('chef@firma.de', OK)
    expect(st.updates[0].UpdateExpression).toMatch(/trustItems = :trustItems.*privacyLine = :privacyLine.*overlays = :overlays/)
    st.updates = []; await pt('chef@firma.de', {})                                  // z. B. Design-Editor: sendet die Felder nicht
    expect(st.updates[0].UpdateExpression).not.toMatch(/trustItems|privacyLine|overlays/)
    await mk('chef@firma.de', {}); expect(Object.keys(st.puts.at(-1))).not.toContain('trustItems')
  })
  it('einzelnes Feld: nur dieses wird überschrieben', async () => {
    await pt('chef@firma.de', { privacyLine: { on: false, text: '' } })
    expect(st.updates[0].UpdateExpression).toMatch(/privacyLine = :privacyLine/); expect(st.updates[0].UpdateExpression).not.toMatch(/trustItems|overlays/)
    expect(st.updates[0].ExpressionAttributeValues[':privacyLine']).toMatchObject({ on: false })
  })
  it('ungültige Werte: 400 und nichts gespeichert (zu viele, zu lang, unbekanntes Icon/Form, falsche Farbe, drei animierte)', async () => {
    const bad = [
      { trustItems: Array.from({ length: 9 }, () => ({ icon: 'check', text: 'x' })) }, { trustItems: [{ icon: 'check', text: 'x'.repeat(61) }] }, { trustItems: [{ icon: 'evil', text: 'x' }] },
      { overlays: Array.from({ length: 9 }, () => ({ shape: 'star' })) }, { overlays: [{ shape: 'star', text: 'x'.repeat(25) }] }, { overlays: [{ shape: 'ufo' }] },
      { overlays: [{ shape: 'star', color: 'red' }] }, { overlays: [{ anim: 'pulse' }, { anim: 'wiggle' }, { anim: 'spin' }] }, { privacyLine: { on: true, text: 'x'.repeat(121) } }, { trustItems: 'x' },
    ]
    for (const b of bad) { expect(await code(mk('chef@firma.de', b)), JSON.stringify(b).slice(0, 50)).toBe(400); expect(await code(pt('chef@firma.de', b))).toBe(400) }
    expect(st.puts).toHaveLength(0); expect(st.updates).toHaveLength(0)
  })
  it('Demo-Konto: 403 sobald eines der Felder vorkommt; ohne die Felder bleibt das Verhalten wie bisher', async () => {
    expect(await code(mk('demo@plexora.eu', OK))).toBe(403); expect(await code(pt('demo@plexora.eu', { overlays: [] }))).toBe(403)
    expect(st.puts).toHaveLength(0)
    expect(await code(mk('demo@plexora.eu', {}))).toBe(200)
  })
  it('Team-Mitglied bearbeitet wie bisher; Fremdmandant 403, ohne Token 401', async () => {
    expect(await code(pt('maria@firma.de', OK))).toBe(200)
    st.updates = []
    expect(await code(pt('fremd@andere.de', OK))).toBe(403); expect(st.updates).toHaveLength(0)
    expect(await code((patch as any)({ headers: {}, context: {}, params: { id: 'c1' }, body: OK }))).toBe(401)
  })
})

describe('Öffentliche Schnittstelle: Whitelist und erneute Bereinigung', () => {
  const pub = async () => ((await (landing as any)({ params: { slug: 'beratung' } })) as any).campaign
  it('Kampagne ohne gespeicherte Werte: Standardwerte (drei Punkte, Datenschutzzeile, keine Overlays) – sieht aus wie vorher', async () => {
    const c = await pub()
    expect(c.trustItems.map((t: any) => t.text)).toEqual(['Anfrage 100 % kostenlos', 'SSL gesichert', 'Antwort in 24 h'])
    expect(c.privacyLine).toEqual({ on: true, text: 'Deine Daten werden vertraulich behandelt.' }); expect(c.overlays).toEqual([])
  })
  it('gespeicherte Werte kommen bereinigt heraus, auch wenn die Datenbankzeile manipuliert ist (Skripte, 99 Overlays, falsche Farbe, drei Animationen)', async () => {
    st.campaigns[0].trustItems = Array.from({ length: 30 }, () => ({ icon: '<img src=x onerror=alert(1)>', text: '<script>alert(1)</script>' + 'a'.repeat(200) }))
    st.campaigns[0].overlays = Array.from({ length: 99 }, () => ({ shape: '<svg onload=1>', color: 'url(javascript:1)', anim: 'pulse', text: 'x'.repeat(99), size: 1e9 }))
    st.campaigns[0].privacyLine = { on: true, text: 'p'.repeat(999) }
    const c = await pub()
    expect(c.trustItems.length).toBe(8); expect(c.overlays.length).toBe(8)
    expect(c.trustItems.every((t: any) => t.text.length <= 60 && t.icon === 'check')).toBe(true)
    expect(c.overlays.every((o: any) => o.text.length <= 24 && o.color === '#f59e0b' && o.shape === 'star' && o.size <= 40)).toBe(true)
    expect(c.overlays.filter((o: any) => o.anim !== 'none')).toHaveLength(2); expect(c.privacyLine.text.length).toBe(120)
    expect(trustItemsHtml(c.trustItems) + privacyLineHtml(c.privacyLine)).not.toMatch(/<script|<img|onerror=/i)       // als HTML maskiert
  })
  it('die Antwort enthält nur freigegebene Felder: keine Besitzer-Kennung, keine Benachrichtigungsadresse, nichts Zusätzliches', async () => {
    st.campaigns[0].internalNote = 'intern'; st.campaigns[0].notifyEmail = 'geheim@firma.de'
    const c = await pub(); const allowed = new Set<string>([...PUBLIC_CAMPAIGN_FIELDS, 'trustItems', 'privacyLine', 'overlays'])
    for (const k of Object.keys(c)) expect(allowed.has(k), k).toBe(true)
    expect(JSON.stringify(c)).not.toMatch(/chef@firma|geheim@|intern"/)
    expect(PUBLIC_CAMPAIGN_FIELDS.filter(f => ['trustItems', 'privacyLine', 'overlays'].includes(f))).toHaveLength(3)
  })
})
