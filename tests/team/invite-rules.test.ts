import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { st, reset, fakeDb, installTeamGlobals, code, ev, OWNER, seedInvite, key } from './helpers'
import { isPublicRoute } from '../../server/utils/routePolicy'

vi.mock('resend', () => ({ Resend: class { emails = { send: async (m: any) => { st.sent.push(m); return { data: { id: '1' }, error: null } } } } }))
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDb() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => e, invalidateTenantCache: () => {} }))
installTeamGlobals()
const { default: invite } = await import('../../server/api/team/invite.post')
const { default: members } = await import('../../server/api/team/members.get')
const { INVITES_PER_DAY } = await import('../../server/utils/teamInvite')
beforeEach(() => reset())
const DAY = 86_400_000

describe('Einladen: Limit pro Konto und Tag', () => {
  it(`die ${INVITES_PER_DAY}. Einladung geht durch, die nächste bekommt 429: keine Mail, kein Eintrag`, async () => {
    expect(INVITES_PER_DAY).toBe(10)
    for (let n = 1; n <= INVITES_PER_DAY; n++) expect((await code(invite(ev(OWNER, { inviteeEmail: `p${n}@x.de` }) as any))).code, `Einladung ${n}`).toBe(200)
    const mails = st.sent.length, rows = st.members.size
    const r = await code(invite(ev(OWNER, { inviteeEmail: 'elf@x.de' }) as any))
    expect(r.code).toBe(429); expect(r.message).toContain('morgen'); expect(st.sent.length).toBe(mails); expect(st.members.size).toBe(rows)
  })
  it('das Limit gilt je Konto: ein anderer Inhaber ist davon nicht betroffen; Zurückziehen setzt den Zähler nicht zurück', async () => {
    for (let n = 1; n <= INVITES_PER_DAY; n++) await invite(ev(OWNER, { inviteeEmail: `p${n}@x.de` }) as any)
    const { default: del } = await import('../../server/api/team/[email].delete')
    for (let n = 1; n <= INVITES_PER_DAY; n++) await del(ev(OWNER, undefined, { email: `p${n}@x.de` }) as any)   // alle zurückgezogen
    expect((await code(invite(ev(OWNER, { inviteeEmail: 'neu@x.de' }) as any))).code).toBe(429)
    expect((await code(invite(ev({ ...OWNER, email: 'anderer@firma.de', userId: 's2' }, { inviteeEmail: 'neu@x.de' }) as any))).code).toBe(200)
  })
  it('ungültige Versuche (kaputte Adresse, Selbsteinladung) verbrauchen kein Limit', async () => {
    for (let n = 0; n < 15; n++) expect((await code(invite(ev(OWNER, { inviteeEmail: 'kaputt' }) as any))).code).toBe(400)
    expect((await code(invite(ev(OWNER, { inviteeEmail: OWNER.email }) as any))).code).toBe(400)
    expect([...st.counters.keys()].filter(k => k.startsWith('team-invite:day'))).toEqual([])
  })
})

describe('Einladen: abgelaufene Einladung, Maskierung', () => {
  it('eine gültige Einladung blockiert eine zweite (409); eine abgelaufene wird mit neuem Token ersetzt; ein aktives Mitglied bleibt (409)', async () => {
    seedInvite()
    expect((await code(invite(ev(OWNER, { inviteeEmail: 'neu@x.de' }) as any))).code).toBe(409)
    reset(); seedInvite({ invitedAt: new Date(Date.now() - 8 * DAY).toISOString(), inviteToken: 'alt' })
    expect((await code(invite(ev(OWNER, { inviteeEmail: 'neu@x.de' }) as any))).code).toBe(200)
    const row = st.members.get(key('chef@firma.de', 'neu@x.de'))!; expect(row.inviteToken).not.toBe('alt'); expect(Date.now() - Date.parse(row.invitedAt)).toBeLessThan(60_000)
    reset(); seedInvite({ status: 'active', inviteToken: '' })
    expect((await code(invite(ev(OWNER, { inviteeEmail: 'neu@x.de' }) as any))).code).toBe(409)
  })
  it('die Absenderadresse wird in der Mail maskiert (kein Einschleusen von HTML) und die Mail nennt das Ablaufdatum', async () => {
    await invite(ev({ ...OWNER, email: 'chef<img src=x onerror=alert(1)>@firma.de' }, { inviteeEmail: 'neu@x.de' }) as any)
    const html = st.sent[0].html; expect(html).not.toContain('<img'); expect(html).toContain('&lt;img'); expect(html).toContain('ist bis'); expect(html).toContain('gültig')
  })
})

describe('Mitgliederliste und Allowlist', () => {
  it('zeigt Ablaufdatum und "abgelaufen", aber nie den Token', async () => {
    seedInvite({ memberEmail: 'a@x.de' }); seedInvite({ memberEmail: 'b@x.de', invitedAt: new Date(Date.now() - 9 * DAY).toISOString(), inviteToken: 'tok-b' }); seedInvite({ memberEmail: 'c@x.de', status: 'active', inviteToken: '' })
    const r: any = await members(ev(OWNER, undefined) as any)
    const by = Object.fromEntries(r.members.map((m: any) => [m.memberEmail, m]))
    expect(by['a@x.de']).toMatchObject({ invitePending: true, inviteExpired: false }); expect(by['b@x.de']).toMatchObject({ inviteExpired: true }); expect(by['c@x.de']).toMatchObject({ inviteExpired: false, inviteExpiresAt: null })
    expect(JSON.stringify(r)).not.toMatch(/tok-/)
  })
  it('team/accept steht nicht mehr in der Allowlist (Anmeldung ist Pflicht); die Vorschau ebenfalls nicht', () => {
    expect(isPublicRoute('/api/team/accept', 'POST')).toBe(false); expect(isPublicRoute('/api/team/invite-preview', 'POST')).toBe(false)
  })
})

describe('Annahmeseite', () => {
  const page = readFileSync('app/pages/invite.vue', 'utf8')
  it('schickt nur den Token (keine E-Mail im Body), mit Anmeldung, und zeigt vorher die Vorschau mit dem Namen des Einladenden', () => {
    const accept = page.slice(page.indexOf('async function acceptInvite'))
    expect(accept).toContain('body: { token }'); expect(accept).not.toMatch(/email:/); expect(accept).toContain('useAuthHeader')
    for (const t of ['/api/team/invite-preview', '{{ preview.inviter }}', 'decideInviteView(u.email, p)', "view.view === 'own-workspace'", "view.view === 'expired'", "view.view === 'unverified'"]) expect(page, t).toContain(t)
  })
  it('die Verwaltung zeigt Ablauf und erlaubt das Zurückziehen', () => {
    const s = readFileSync('app/pages/settings/index.vue', 'utf8')
    expect(s).toContain('Einladung zurückziehen'); expect(s).toContain('m.inviteExpired')
  })
})
