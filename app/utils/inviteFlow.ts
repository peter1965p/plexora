// Ablauf der Einladungsseite (/invite?token=…) als reine Funktionen, damit jeder Fall testbar ist.

/** Rückkehradresse nach der Anmeldung: nur der Einladungslink selbst (verhindert offene Weiterleitungen) */
const RETURN_KEY = 'plx_invite_return'
const RETURN_RE = /^\/invite\?token=[A-Za-z0-9-]{8,64}$/
const RETURN_TTL_MS = 15 * 60_000
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const store = (): Store | null => { try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null } catch { return null } }

/** Merkt sich den Einladungslink nur im Browser (sessionStorage). Der Token wandert nie in den OAuth-Aufruf zu Cognito oder Google. */
export function rememberInviteReturn(path: string, s: Store | null = store(), now = Date.now()) {
  if (!s || !RETURN_RE.test(path)) return false
  try { s.setItem(RETURN_KEY, JSON.stringify({ path, at: now })); return true } catch { return false }
}
/** Liefert die gemerkte Adresse genau einmal (und nur, wenn sie gültig und nicht älter als 15 Minuten ist), sonst null */
export function takeInviteReturn(s: Store | null = store(), now = Date.now()): string | null {
  if (!s) return null
  try {
    const raw = s.getItem(RETURN_KEY); s.removeItem(RETURN_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    return typeof v?.path === 'string' && RETURN_RE.test(v.path) && typeof v.at === 'number' && now - v.at <= RETURN_TTL_MS && now >= v.at - 5000 ? v.path : null
  } catch { return null }
}

/** Ist eine Rückkehr zur Einladung vorgemerkt? (ohne sie zu verbrauchen; für Hinweise und den Kontenwähler auf der Anmeldeseite) */
export function peekInviteReturn(s: Store | null = store(), now = Date.now()): boolean {
  if (!s) return false
  try { const v = JSON.parse(s.getItem(RETURN_KEY) || 'null'); return !!v && RETURN_RE.test(v.path) && typeof v.at === 'number' && now - v.at <= RETURN_TTL_MS } catch { return false }
}

export interface InvitePreview { mismatch?: boolean; invitedEmail?: string; expired?: boolean; hasOwnWorkspace?: boolean; emailVerified?: boolean; inviter?: string }
export type InviteView = { view: 'login' } | { view: 'mismatch'; invitedEmail: string; signedInAs: string } | { view: 'expired' } | { view: 'own-workspace' } | { view: 'unverified' } | { view: 'accept' }

/** Welche Ansicht zeigt die Einladungsseite? signedInEmail leer = nicht angemeldet. */
export function decideInviteView(signedInEmail: string, preview: InvitePreview | null): InviteView {
  if (!signedInEmail) return { view: 'login' }
  if (!preview) return { view: 'login' }
  if (preview.mismatch) return { view: 'mismatch', invitedEmail: String(preview.invitedEmail || ''), signedInAs: signedInEmail }
  if (preview.expired) return { view: 'expired' }
  if (preview.hasOwnWorkspace) return { view: 'own-workspace' }
  if (!preview.emailVerified) return { view: 'unverified' }
  return { view: 'accept' }
}
