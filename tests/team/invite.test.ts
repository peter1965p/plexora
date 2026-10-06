import { describe, it, expect, vi, beforeEach } from 'vitest'

const sent: any[] = []; const puts: any[] = []; const deletes: any[] = []
let members = new Map<string, any>(); let mailFails = false
vi.mock('resend', () => ({
  Resend: class { emails = { send: async (m: any) => { if (mailFails) return { data: null, error: { message: 'boom' } }; sent.push(m); return { data: { id: '1' }, error: null } } } },
}))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input
      if (i.TableName === 'plexora-team-members') {
        const k = `${(i.Key || i.Item).tenantId}|${(i.Key || i.Item).memberEmail}`
        if (n === 'GetCommand') return { Item: members.get(k) }
        if (n === 'PutCommand') { puts.push(i.Item); members.set(k, i.Item); return {} }
        if (n === 'DeleteCommand') { deletes.push(i.Key); members.delete(k); return {} }
      }
      return {}
    },
  }),
}))
vi.mock('../../server/utils/tenant', () => ({
  resolveUserId: async (e: string) => ({ 'maria@firma.de': 'chef@firma.de' } as Record<string, string>)[e] || e,
  invalidateTenantCache: () => {},
}))
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 'k' }))

const { default: invite } = await import('../../server/api/team/invite.post')
const owner = { userId: 'sub-chef', email: 'chef@firma.de', groups: ['admins'] }
const member = { userId: 'sub-maria', email: 'maria@firma.de', groups: ['customers'] }
const demo = { userId: 'sub-d', email: 'demo@plexora.eu', groups: ['customers'] }
const ev = (auth: any, body: any) => ({ context: { auth }, body })
const status = (p: Promise<any>) => p.then(() => 200, (e: any) => e.statusCode)

beforeEach(() => { sent.length = 0; puts.length = 0; deletes.length = 0; members = new Map(); mailFails = false })

describe('Einladung: Anmeldung, Demo-Sperre, Besitzerprüfung', () => {
  it('ohne Token 401, Demo-Konto 403: keine Einladung, keine Mail', async () => {
    expect(await status(invite(ev(undefined, { inviteeEmail: 'neu@x.de' }) as any))).toBe(401)
    expect(await status(invite(ev(demo, { inviteeEmail: 'neu@x.de' }) as any))).toBe(403)
    expect(puts).toEqual([]); expect(sent).toEqual([])
  })
  it('ein eingeladenes Team-Mitglied darf nicht weiter einladen (403)', async () => {
    expect(await status(invite(ev(member, { inviteeEmail: 'neu@x.de' }) as any))).toBe(403)
    expect(puts).toEqual([]); expect(sent).toEqual([])
  })
  it('der Inhaber lädt ein: Eintrag mit Token und Mail', async () => {
    expect(await status(invite(ev(owner, { inviteeEmail: 'neu@x.de', role: 'admin' }) as any))).toBe(200)
    expect(puts.length).toBe(1)
    expect(puts[0]).toMatchObject({ tenantId: 'chef@firma.de', memberEmail: 'neu@x.de', role: 'admin', status: 'invited' })
    expect(puts[0].inviteToken).toMatch(/^[0-9a-f-]{36}$/)
    expect(sent.map(m => m.to)).toEqual(['neu@x.de'])
    expect(sent[0].html).toContain(`/invite?token=${puts[0].inviteToken}`)
  })
})

describe('Eingaben', () => {
  it('ungültige, mehrfache oder fehlende Adressen: 400', async () => {
    for (const bad of ['', 'kein-at', 'a@b.de,c@d.de', 'Name <a@b.de>', 'a@b.de\nBcc: x@y.de', undefined, 42])
      expect(await status(invite(ev(owner, { inviteeEmail: bad }) as any)), String(bad)).toBe(400)
    expect(puts).toEqual([]); expect(sent).toEqual([])
  })
  it('Rolle nur member oder admin, Standard member', async () => {
    expect(await status(invite(ev(owner, { inviteeEmail: 'a@x.de', role: 'superadmin' }) as any))).toBe(400)
    expect(await status(invite(ev(owner, { inviteeEmail: 'b@x.de', role: { $ne: 1 } }) as any))).toBe(400)
    await invite(ev(owner, { inviteeEmail: 'c@x.de' }) as any)
    expect(puts.map(p => p.role)).toEqual(['member'])
  })
  it('Selbsteinladung (auch in anderer Schreibweise) und doppelte Einladung werden abgelehnt', async () => {
    expect(await status(invite(ev(owner, { inviteeEmail: 'CHEF@firma.de' }) as any))).toBe(400)
    await invite(ev(owner, { inviteeEmail: 'neu@x.de' }) as any)
    expect(await status(invite(ev(owner, { inviteeEmail: 'neu@x.de' }) as any))).toBe(409)
    expect(puts.length).toBe(1)
  })
})

describe('Mail-Fehler', () => {
  it('schlägt der Versand fehl, wird die Einladung wieder entfernt (502) und kann erneut versucht werden', async () => {
    mailFails = true
    expect(await status(invite(ev(owner, { inviteeEmail: 'neu@x.de' }) as any))).toBe(502)
    expect(deletes).toEqual([{ tenantId: 'chef@firma.de', memberEmail: 'neu@x.de' }])
    expect(members.size).toBe(0)
    mailFails = false
    expect(await status(invite(ev(owner, { inviteeEmail: 'neu@x.de' }) as any))).toBe(200)
  })
})
