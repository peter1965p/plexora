import { describe, it, expect, vi, beforeEach } from 'vitest'
import { st, reset, fakeDb, installTeamGlobals, code, status, ev, OWNER, INVITEE, seedInvite, key } from './helpers'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDb() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => e, invalidateTenantCache: () => {} }))
installTeamGlobals()
const { default: accept } = await import('../../server/api/team/accept.post')
const { default: preview } = await import('../../server/api/team/invite-preview.post')
const { inviteExpired, INVITE_TTL_DAYS } = await import('../../server/utils/teamInvite')
beforeEach(() => reset())
const DAY = 86_400_000

describe('Annehmen: Anmeldung und Identität', () => {
  it('ohne Anmeldung 401, Demo-Konto 403; es ändert sich nichts', async () => {
    seedInvite()
    expect(await status(accept(ev(undefined, { token: 'tok-1111' }) as any))).toBe(401)
    expect(await status(accept(ev({ ...INVITEE, email: 'demo@plexora.eu' }, { token: 'tok-1111' }) as any))).toBe(403)
    expect(st.updates).toEqual([]); expect(st.members.get(key('chef@firma.de', 'neu@x.de'))!.status).toBe('invited')
  })
  it('nur das Konto mit der eingeladenen Adresse: ein anderes Konto mit gültigem Token bekommt 403, auch wenn es die fremde Adresse im Body mitschickt', async () => {
    seedInvite()
    const fremd = { userId: 'sub-x', email: 'angreifer@evil.de', groups: [], emailVerified: true }
    expect(await status(accept(ev(fremd, { token: 'tok-1111' }) as any))).toBe(403)
    expect(await status(accept(ev(fremd, { token: 'tok-1111', email: 'neu@x.de' }) as any))).toBe(403)   // E-Mail im Body wird ignoriert
    expect(st.updates).toEqual([])
  })
  it('Groß-/Kleinschreibung der Adresse spielt keine Rolle', async () => {
    seedInvite()
    expect(await status(accept(ev({ ...INVITEE, email: 'Neu@X.DE' }, { token: 'tok-1111' }) as any))).toBe(200)
  })
  it('die Adresse muss verifiziert sein (sonst könnte sich jemand mit einer nur eingetragenen Adresse einklinken)', async () => {
    seedInvite()
    expect(await status(accept(ev({ ...INVITEE, emailVerified: false }, { token: 'tok-1111' }) as any))).toBe(403)
    expect(await status(accept(ev({ userId: 's', email: 'neu@x.de', groups: [] }, { token: 'tok-1111' }) as any))).toBe(403)
    expect(st.updates).toEqual([])
  })
  it('ohne Token oder mit erfundenem Token: 400 bzw. 404', async () => {
    seedInvite()
    expect(await status(accept(ev(INVITEE, {}) as any))).toBe(400); expect(await status(accept(ev(INVITEE, { token: 123 }) as any))).toBe(400)
    expect(await status(accept(ev(INVITEE, { token: 'gibt-es-nicht' }) as any))).toBe(404)
  })
})

describe('Annehmen: 7 Tage, einmalig, widerrufbar', () => {
  it('Ablauf: nach 7 Tagen 410, vorher geht es; fehlendes oder kaputtes Datum gilt als abgelaufen', async () => {
    seedInvite({ invitedAt: new Date(Date.now() - (INVITE_TTL_DAYS * DAY + 1000)).toISOString() })
    expect((await code(accept(ev(INVITEE, { token: 'tok-1111' }) as any))).code).toBe(410)
    reset(); seedInvite({ invitedAt: new Date(Date.now() - (INVITE_TTL_DAYS * DAY - 60_000)).toISOString() })
    expect((await code(accept(ev(INVITEE, { token: 'tok-1111' }) as any))).code).toBe(200)
    expect(INVITE_TTL_DAYS).toBe(7)
    for (const bad of [undefined, null, '', 'kein-datum', 5]) expect(inviteExpired(bad as any), String(bad)).toBe(true)
  })
  it('einmalig: die zweite Annahme mit demselben Token scheitert (404 bzw. 409), der Token ist danach leer', async () => {
    seedInvite()
    expect((await code(accept(ev(INVITEE, { token: 'tok-1111' }) as any))).code).toBe(200)
    expect(st.members.get(key('chef@firma.de', 'neu@x.de'))).toMatchObject({ status: 'active', inviteToken: '' })
    expect([404, 409]).toContain((await code(accept(ev(INVITEE, { token: 'tok-1111' }) as any))).code)
  })
  it('zwei gleichzeitige Annahmen: nur eine gewinnt, die Bedingung im Schreibvorgang verhindert die zweite (409)', async () => {
    const row = seedInvite()
    // Beide haben die Zeile schon gelesen (Scan), dann gewinnt der erste Schreibvorgang
    const first = await code(accept(ev(INVITEE, { token: 'tok-1111' }) as any))
    // zweiter Schreibvorgang auf den Stand "vor der Annahme": Zeile ist inzwischen verbraucht
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb')
    const u = st.updates[0]
    expect(u.ConditionExpression).toBe('#s = :invited AND inviteToken = :t')
    await expect(fakeDb().send(new UpdateCommand(u))).rejects.toMatchObject({ name: 'ConditionalCheckFailedException' })
    expect(first.code).toBe(200); expect(row.status).toBe('active')
  })
  it('vom Inhaber widerrufbar: ist die Zeile gelöscht, ist der Token tot (404)', async () => {
    seedInvite()
    const { default: del } = await import('../../server/api/team/[email].delete')
    expect(await status(del(ev(OWNER, undefined, { email: encodeURIComponent('neu@x.de') }) as any))).toBe(200)
    expect((await code(accept(ev(INVITEE, { token: 'tok-1111' }) as any))).code).toBe(404)
  })
})

describe('Annehmen: kein stilles Übernehmen eines bestehenden Arbeitsbereichs', () => {
  it('hat das Konto Daten in einem Kernmodul, einen Nexora-Mandanten, eine Lizenz oder eigene Teammitglieder: 409, die Zeile bleibt unberührt', async () => {
    for (const setup of [() => { st.ownData['plexora-contacts'] = ['neu@x.de'] }, () => { st.ownData['plexora-finance'] = ['neu@x.de'] }, () => { st.nexora.push({ email: 'neu@x.de' }) }, () => { st.licenses.push({ customerEmail: 'neu@x.de' }) },
      () => { st.members.set(key('neu@x.de', 'kollege@x.de'), { tenantId: 'neu@x.de', memberEmail: 'kollege@x.de', status: 'active' }) }]) {
      reset(); seedInvite(); setup()
      const r = await code(accept(ev(INVITEE, { token: 'tok-1111' }) as any))
      expect(r.code).toBe(409); expect(r.message).toContain('eigenen Daten'); expect(st.updates).toEqual([])
      expect(st.members.get(key('chef@firma.de', 'neu@x.de'))!.status).toBe('invited')
    }
  })
  it('im Zweifel ablehnen: schlägt die Prüfung fehl, wird nicht übernommen', async () => {
    seedInvite(); st.failTables = true
    expect((await code(accept(ev(INVITEE, { token: 'tok-1111' }) as any))).code).toBe(409); expect(st.updates).toEqual([])
  })
  it('ein frisches Konto ohne Daten kann annehmen', async () => {
    seedInvite(); expect((await code(accept(ev(INVITEE, { token: 'tok-1111' }) as any))).code).toBe(200)
  })
})

describe('Vorschau', () => {
  it('anderes Konto: nur die eingeladene Adresse wird genannt (für "Diese Einladung gilt für …"), nichts über Einladenden, Mandant, Rolle oder Ablauf; ohne Anmeldung 401', async () => {
    seedInvite()
    expect(await status(preview(ev(undefined, { token: 'tok-1111' }) as any))).toBe(401)
    const r: any = await preview(ev({ userId: 'x', email: 'angreifer@evil.de', groups: [], emailVerified: true }, { token: 'tok-1111' }) as any)
    expect(r).toEqual({ mismatch: true, invitedEmail: 'neu@x.de' }); expect(JSON.stringify(r)).not.toMatch(/chef@firma|member|admin|expires|tok-1111/)
  })
  it('liefert Einladenden, Rolle, Ablauf und die Gründe, die das Annehmen verhindern – aber nie den Token', async () => {
    seedInvite(); st.ownData['plexora-deals'] = ['neu@x.de']
    const p: any = await preview(ev(INVITEE, { token: 'tok-1111' }) as any)
    expect(p).toMatchObject({ inviter: 'chef@firma.de', role: 'member', expired: false, emailVerified: true, hasOwnWorkspace: true })
    expect(new Date(p.expiresAt).getTime()).toBeGreaterThan(Date.now()); expect(JSON.stringify(p)).not.toContain('tok-1111')
    reset(); seedInvite({ invitedAt: new Date(Date.now() - 8 * DAY).toISOString() })
    expect(((await preview(ev(INVITEE, { token: 'tok-1111' }) as any)) as any).expired).toBe(true)
  })
})
