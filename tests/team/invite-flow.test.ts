import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { decideInviteView, rememberInviteReturn, takeInviteReturn, peekInviteReturn } from '../../app/utils/inviteFlow'
import { st, reset, fakeDb, installTeamGlobals, code, ev, seedInvite } from './helpers'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDb() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => e, invalidateTenantCache: () => {} }))
installTeamGlobals()
const { default: accept } = await import('../../server/api/team/accept.post')
const { default: preview } = await import('../../server/api/team/invite-preview.post')
beforeEach(() => reset())

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) }, m } }
const TOKEN = '11111111-2222-4333-8444-555555555555'
const PATH = `/invite?token=${TOKEN}`

describe('Szenario: zweites Google-Konto im selben Browser', () => {
  const PRIVAT = { userId: 'g-privat', email: 'privat@gmail.com', groups: [], emailVerified: true }
  const ARBEIT = { userId: 'g-arbeit', email: 'arbeit@gmail.com', groups: [], emailVerified: true }
  it('der Browser ist als privat@gmail.com angemeldet, die Einladung gilt für arbeit@gmail.com: Server meldet Abweichung, die Seite zeigt "Falsches Konto", Annehmen ist verboten', async () => {
    seedInvite({ memberEmail: 'arbeit@gmail.com' })
    const p: any = await preview(ev(PRIVAT, { token: 'tok-1111' }) as any); expect(p).toEqual({ mismatch: true, invitedEmail: 'arbeit@gmail.com' })
    expect(decideInviteView(PRIVAT.email, p)).toEqual({ view: 'mismatch', invitedEmail: 'arbeit@gmail.com', signedInAs: 'privat@gmail.com' })
    expect((await code(accept(ev(PRIVAT, { token: 'tok-1111' }) as any))).code).toBe(403); expect(st.updates).toEqual([])
  })
  it('nach "Abmelden und mit dem richtigen Konto fortfahren" und Google-Anmeldung als arbeit@gmail.com: Annahme möglich, die Rückkehr zur Einladung ist gemerkt', async () => {
    seedInvite({ memberEmail: 'arbeit@gmail.com' }); const s = mem()
    expect(rememberInviteReturn(PATH, s)).toBe(true); expect(decideInviteView('', null)).toEqual({ view: 'login' })       // abgemeldet: Anmeldeansicht mit Kontenwähler
    expect(takeInviteReturn(s)).toBe(PATH)                                                                                   // nach der Anmeldung zurück zur Einladung
    const p: any = await preview(ev(ARBEIT, { token: 'tok-1111' }) as any); expect(decideInviteView(ARBEIT.email, { ...p, emailVerified: true })).toEqual({ view: 'accept' })
    expect((await code(accept(ev(ARBEIT, { token: 'tok-1111' }) as any))).code).toBe(200)
  })
  it('auch Groß-/Kleinschreibung der Adresse stört nicht (Google liefert oft kleingeschrieben)', async () => {
    seedInvite({ memberEmail: 'Arbeit@Gmail.com' }); const p: any = await preview(ev(ARBEIT, { token: 'tok-1111' }) as any); expect(p.mismatch).toBeUndefined(); expect(p.inviter).toBe('chef@firma.de')
  })
})

describe('Ansicht der Einladungsseite', () => {
  const ok = { emailVerified: true, inviter: 'chef@firma.de' }
  it('jede Lage hat genau eine Ansicht', () => {
    expect(decideInviteView('', null)).toEqual({ view: 'login' }); expect(decideInviteView('a@x.de', null)).toEqual({ view: 'login' })
    expect(decideInviteView('a@x.de', { mismatch: true, invitedEmail: 'b@x.de' })).toMatchObject({ view: 'mismatch', invitedEmail: 'b@x.de', signedInAs: 'a@x.de' })
    expect(decideInviteView('a@x.de', { ...ok, expired: true })).toEqual({ view: 'expired' }); expect(decideInviteView('a@x.de', { ...ok, hasOwnWorkspace: true })).toEqual({ view: 'own-workspace' })
    expect(decideInviteView('a@x.de', { inviter: 'x', emailVerified: false })).toEqual({ view: 'unverified' }); expect(decideInviteView('a@x.de', ok)).toEqual({ view: 'accept' })
  })
  it('Falsches Konto hat Vorrang: wer die Einladung gar nicht annehmen darf, bekommt weder "abgelaufen" noch "eigener Arbeitsbereich" zu sehen', () => {
    expect(decideInviteView('a@x.de', { mismatch: true, invitedEmail: 'b@x.de', expired: true, hasOwnWorkspace: true } as any).view).toBe('mismatch')
  })
})

describe('Rückkehr zur Einladung: nur der Einladungslink, einmalig, nur kurz', () => {
  it('Merken und genau einmal abholen', () => { const s = mem(); expect(rememberInviteReturn(PATH, s)).toBe(true); expect(peekInviteReturn(s)).toBe(true); expect(takeInviteReturn(s)).toBe(PATH); expect(takeInviteReturn(s)).toBeNull(); expect(peekInviteReturn(s)).toBe(false) })
  it('nach 15 Minuten verfällt sie; ein Zeitstempel aus der Zukunft wird verworfen', () => {
    const s = mem(); const t = Date.now(); rememberInviteReturn(PATH, s, t); expect(takeInviteReturn(s, t + 16 * 60_000)).toBeNull()
    rememberInviteReturn(PATH, s, t + 3_600_000); expect(takeInviteReturn(s, t)).toBeNull()
    rememberInviteReturn(PATH, s, t); expect(takeInviteReturn(s, t + 14 * 60_000)).toBe(PATH)
  })
  it('keine offene Weiterleitung: jede andere Adresse wird nicht gemerkt – und auch nicht ausgegeben, wenn jemand den Speicher manipuliert hat', () => {
    const bad = ['/dashboard', 'https://evil.de', '//evil.de', '/\\evil.de', 'javascript:alert(1)', '/invite?token=abc', `/invite?token=${TOKEN}&next=https://evil.de`, `/invite?token=${TOKEN}#x`, `/invite/../admin?token=${TOKEN}`, `/invite?token=${TOKEN}\n`, '', `https://app.plexora.eu${PATH}`]
    for (const b of bad) { const s = mem(); expect(rememberInviteReturn(b, s), b).toBe(false); expect(s.m.size).toBe(0); s.setItem('plx_invite_return', JSON.stringify({ path: b, at: Date.now() })); expect(takeInviteReturn(s), b).toBeNull() }
    const s = mem(); s.setItem('plx_invite_return', 'kein json'); expect(takeInviteReturn(s)).toBeNull(); expect(takeInviteReturn(null)).toBeNull(); expect(rememberInviteReturn(PATH, null)).toBe(false)
  })
})

describe('Seiten: Kontenwähler und Meldung', () => {
  const inv = readFileSync('app/pages/invite.vue', 'utf8'), login = readFileSync('app/pages/login.vue', 'utf8'), cb = readFileSync('app/pages/auth/callback.vue', 'utf8')
  it('Google im Einladungsablauf immer mit Kontenwähler; der Einladungs-Token geht nie in den OAuth-Aufruf (kein customState, kein state)', () => {
    expect(inv).toContain("signInWithRedirect({ provider: 'Google', options: { prompt: 'SELECT_ACCOUNT' } })"); expect(inv).not.toMatch(/customState|state:\s*token|loginHint/)
    expect(login).toContain('options: { prompt: "SELECT_ACCOUNT" }'); expect(login).toContain('pendingInvite.value ?')
  })
  it('die Meldung bei falschem Konto nennt beide Adressen und bietet Abmelden und Fortfahren an', () => {
    for (const t of ['Diese Einladung gilt für <strong>{{ view.invitedEmail }}</strong>, du bist als <strong>{{ view.signedInAs }}</strong> angemeldet.', 'Abmelden und mit dem richtigen Konto fortfahren', 'await signOut()', 'rememberInviteReturn(returnPath)']) expect(inv, t).toContain(t)
  })
  it('nach der Anmeldung (Passwort, Passkey, Google-Rücksprung) geht es zur gemerkten Einladung zurück, sonst zum Dashboard', () => {
    expect((login.match(/takeInviteReturn\(\) \|\|/g) || []).length).toBe(4); expect(cb).toContain('takeInviteReturn() || path'); expect(cb).toMatch(/if \(path === "\/dashboard"\)/)
  })
})
