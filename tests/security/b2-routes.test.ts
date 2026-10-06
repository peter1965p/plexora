import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync } from 'node:fs'
import { installGlobals, authEv, code, resolveUserIdFake } from '../botprotection/helpers'

const store = {
  team: [] as any[],                 // plexora-team-members
  settings: new Map<string, any>(),  // "settingId|scope"
  nexora: [] as any[],               // plexora-nexora
  deleted: [] as string[],
}
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const t = i.TableName
      if (t === 'plexora-team-members') {
        if (n === 'QueryCommand') return { Items: store.team.filter(m => m.tenantId === i.ExpressionAttributeValues[':t']) }
        if (n === 'DeleteCommand') { store.deleted.push(`${i.Key.tenantId}|${i.Key.memberEmail}`); store.team = store.team.filter(m => !(m.tenantId === i.Key.tenantId && m.memberEmail === i.Key.memberEmail)); return {} }
      }
      if (t === 'plexora-settings') {
        if (n === 'GetCommand') return { Item: store.settings.get(`${i.Key.settingId}|${i.Key.scope}`) }
        if (n === 'PutCommand') { store.settings.set(`${i.Item.settingId}|${i.Item.scope}`, i.Item); return {} }
      }
      if (t === 'plexora-nexora' && n === 'ScanCommand') return { Items: store.nexora.filter(x => x.email === i.ExpressionAttributeValues[':e']) }
      return {}
    },
  }),
}))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveUserIdFake(e), invalidateTenantCache: () => {} }))
installGlobals()

const { default: members } = await import('../../server/api/team/members.get')
const { default: removeMember } = await import('../../server/api/team/[email].delete')
const { default: invoiceGet } = await import('../../server/api/settings/invoice.get')
const { default: invoicePost } = await import('../../server/api/settings/invoice.post')
const { default: branchGet } = await import('../../server/api/settings/branch-packages.get')
const { default: campaignPresets } = await import('../../server/api/campaigns/presets.get')
const { default: pricetagPresets } = await import('../../server/api/automotive/pricetag-templates/presets.get')
const { default: invoicePresets } = await import('../../server/api/settings/invoice-presets.get')

const OWNER = 'chef@firma.de'
const anon = { headers: {}, context: {}, params: {}, query: {}, body: {} }

beforeEach(() => {
  store.team = [
    { tenantId: OWNER, memberEmail: 'maria@firma.de', role: 'member', status: 'active', inviteToken: 'tok-aktiv' },
    { tenantId: OWNER, memberEmail: 'neu@firma.de', role: 'admin', status: 'invited', inviteToken: 'tok-geheim-123' },
    { tenantId: 'fremd@andere.de', memberEmail: 'x@andere.de', role: 'member', status: 'active', inviteToken: 'tok-fremd' },
  ]
  store.settings.clear(); store.deleted = []
  store.nexora = [{ tenantId: 'T1', email: OWNER, branchModules: [{ key: 'gastro', status: 'active' }] }]
})

describe('Vorlagen-Listen verlangen Anmeldung', () => {
  it('ohne Token 401, mit Token Daten', async () => {
    for (const h of [campaignPresets, pricetagPresets, invoicePresets]) {
      expect(await code((h as any)(anon))).toBe(401)
      expect(await code((h as any)(authEv(OWNER)))).toBe(200)
    }
  })
})

describe('Team: Mitgliederliste', () => {
  it('ohne Token 401 (statt leerer Liste)', async () => {
    expect(await code((members as any)(anon))).toBe(401)
  })
  it('Inhaber sieht die Liste seines Mandanten – ohne Einladungs-Token in der Antwort', async () => {
    const res: any = await (members as any)(authEv(OWNER))
    expect(res.members.map((m: any) => m.memberEmail).sort()).toEqual(['maria@firma.de', 'neu@firma.de'])
    const json = JSON.stringify(res)
    expect(json).not.toContain('tok-geheim-123'); expect(json).not.toContain('tok-aktiv'); expect(json).not.toContain('inviteToken')
    expect(res.members.find((m: any) => m.memberEmail === 'neu@firma.de')).toMatchObject({ status: 'invited', role: 'admin', invitePending: true })
    expect(res.members.find((m: any) => m.memberEmail === 'maria@firma.de').invitePending).toBe(false)
  })
  it('die Team-Seite bekommt weiter, was sie anzeigt (E-Mail, Rolle, Status)', async () => {
    const res: any = await (members as any)(authEv(OWNER))
    for (const m of res.members) { expect(m.memberEmail).toBeTruthy(); expect(m.role).toBeTruthy(); expect(m.status).toBeTruthy() }
  })
  it('Team-Mitglied sieht die Liste seines Inhabers, Fremdmandant nur die eigene', async () => {
    expect(((await (members as any)(authEv('maria@firma.de'))) as any).members).toHaveLength(2)
    const other: any = await (members as any)(authEv('fremd@andere.de'))
    expect(other.members.map((m: any) => m.memberEmail)).toEqual(['x@andere.de'])
  })
  it('?userId= aus der Adresse wird ignoriert (Mandant kommt nur aus dem Token)', async () => {
    const res: any = await (members as any)(authEv('fremd@andere.de', { query: { userId: OWNER } }))
    expect(res.members.map((m: any) => m.memberEmail)).toEqual(['x@andere.de'])
  })
})

describe('Team: Mitglied entfernen', () => {
  const del = (email: string, target: string, groups?: string[]) => (removeMember as any)(authEv(email, { params: { email: encodeURIComponent(target) } }, groups))
  it('ohne Token 401', async () => { expect(await code((removeMember as any)({ ...anon, params: { email: 'maria@firma.de' } }))).toBe(401) })
  it('Inhaber entfernt ein Mitglied', async () => {
    expect(await code(del(OWNER, 'maria@firma.de'))).toBe(200)
    expect(store.deleted).toEqual([`${OWNER}|maria@firma.de`])
  })
  it('Mitglied (kein Inhaber) 403, Demo-Konto 403, Fremdmandant löscht nichts beim Inhaber', async () => {
    expect(await code(del('maria@firma.de', 'neu@firma.de'))).toBe(403)
    expect(await code(del('demo@plexora.eu', 'maria@firma.de'))).toBe(403)
    await del('fremd@andere.de', 'maria@firma.de')                 // löscht höchstens im eigenen Mandanten (nicht vorhanden)
    expect(store.deleted.every(d => d.startsWith('fremd@andere.de|'))).toBe(true)
    expect(store.team.some(m => m.memberEmail === 'maria@firma.de')).toBe(true)
  })
  it('sich selbst entfernen: 400', async () => { expect(await code(del(OWNER, OWNER))).toBe(400) })
})

describe('Rechnungseinstellungen', () => {
  it('ohne Token 401 (lesen und speichern)', async () => {
    expect(await code((invoiceGet as any)(anon))).toBe(401)
    expect(await code((invoicePost as any)({ ...anon, body: { dueDays: 3 } }))).toBe(401)
  })
  it('Inhaber speichert und liest im eigenen Mandanten; Mitglied schreibt in den Mandanten des Inhabers; Fremdmandant sieht nichts davon', async () => {
    await (invoicePost as any)(authEv(OWNER, { body: { dueDays: 14, dueText: 'Zahlbar in 14 Tagen', vatRate: 7, userId: 'fremd@andere.de' } }))
    expect(store.settings.get(`invoice|${OWNER}`)).toMatchObject({ dueDays: 14, vatRate: 7 })
    expect(store.settings.has('invoice|fremd@andere.de')).toBe(false)           // userId aus dem Body zählt nicht
    expect(((await (invoiceGet as any)(authEv('maria@firma.de'))) as any).settings.dueDays).toBe(14)
    expect(((await (invoiceGet as any)(authEv('fremd@andere.de'))) as any).settings.dueDays).toBe(7)   // Standardwert
  })
  it('Demo-Konto speichert nichts: 403', async () => {
    expect(await code((invoicePost as any)(authEv('demo@plexora.eu', { body: { dueDays: 1 } })))).toBe(403)
    expect(store.settings.size).toBe(0)
  })
})

describe('Branchen-Pakete lesen', () => {
  it('ohne Token 401; mit Token die eigenen Module', async () => {
    expect(await code((branchGet as any)(anon))).toBe(401)
    expect(((await (branchGet as any)(authEv(OWNER))) as any).branchModules).toEqual([{ key: 'gastro', status: 'active' }])
    expect(((await (branchGet as any)(authEv('fremd@andere.de'))) as any).branchModules).toEqual([])
  })
})

describe('Entfernte Route', () => {
  it('marketing/update-redirects existiert nicht mehr', () => {
    expect(existsSync('server/api/marketing/update-redirects.post.ts')).toBe(false)
  })
})
