// Besucher-Konten und Kommentare auf Unternehmens-Webseiten (Nexora): Eingaben prüfen. Reine Logik, kein Netz, keine Datenbank.
export type CommentsMode = 'off' | 'open' | 'moderated'
export const COMMENT_MODES: readonly CommentsMode[] = ['off', 'open', 'moderated']
export const COMMENT_MODE_LABELS: Record<CommentsMode, string> = { off: 'Aus (keine Kommentare)', open: 'An (sofort sichtbar)', moderated: 'An (erst nach deiner Freigabe)' }
export const parseCommentsMode = (v: unknown): CommentsMode => (v === 'open' || v === 'moderated' ? v : 'off')

export type CommentStatus = 'approved' | 'pending' | 'hidden'
export const COMMENT_STATUS: readonly CommentStatus[] = ['approved', 'pending', 'hidden']

export const LIMITS = { nameMin: 2, nameMax: 60, emailMax: 254, passMin: 10, passMax: 128, commentMin: 2, commentMax: 2000, maxLinks: 2 }
export class VisitorError extends Error { constructor(message: string) { super(message) } }

const EMAIL_RE = /^[^\s@,;<>"'()\\]+@[^\s@,;<>"'()\\]+\.[^\s@,;<>"'()\\]+$/
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f‪-‮⁦-⁩]/g      // Steuer- und Richtungszeichen (Umkehr von Text)
export const normalizeEmail = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '')
export const validEmail = (e: string) => e.length > 0 && e.length <= LIMITS.emailMax && EMAIL_RE.test(e)
export const cleanLine = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(CTRL, '').replace(/\s+/g, ' ').trim().slice(0, max) : '')

export interface Registration { name: string; email: string; password: string }
/** Registrierung prüfen. Das Passwort wird nie verändert (kein Kürzen, kein Trimmen), nur Länge und einfache Qualität geprüft. */
export function parseRegistration(raw: any): Registration {
  const b = raw && typeof raw === 'object' ? raw : {}
  const name = cleanLine(b.name, LIMITS.nameMax)
  if (name.length < LIMITS.nameMin) throw new VisitorError(`Bitte einen Namen mit mindestens ${LIMITS.nameMin} Zeichen angeben.`)
  const email = normalizeEmail(b.email)
  if (!validEmail(email)) throw new VisitorError('Bitte eine gültige E-Mail-Adresse angeben.')
  const password = typeof b.password === 'string' ? b.password : ''
  checkPassword(password, [name, email])
  return { name, email, password }
}
export function checkPassword(password: string, personal: string[] = []) {
  if (password.length < LIMITS.passMin) throw new VisitorError(`Das Passwort braucht mindestens ${LIMITS.passMin} Zeichen.`)
  if (password.length > LIMITS.passMax) throw new VisitorError(`Das Passwort darf höchstens ${LIMITS.passMax} Zeichen haben.`)
  if (new Set(password).size < 4) throw new VisitorError('Das Passwort ist zu einfach (zu wenige verschiedene Zeichen).')
  const low = password.toLowerCase()
  if (['passwort', 'password', '1234567890', 'qwertzuiop', 'qwertyuiop'].some(w => low.includes(w))) throw new VisitorError('Das Passwort ist zu leicht zu erraten.')
  for (const p of personal) { const part = p.toLowerCase().split('@')[0]; if (part.length >= 4 && low.includes(part)) throw new VisitorError('Das Passwort darf nicht deinen Namen oder deine E-Mail-Adresse enthalten.') }
}

/** Kommentartext prüfen: Klartext (keine HTML-Auszeichnung), Länge, höchstens zwei Links (Spam). Zeilenumbrüche bleiben. */
export function parseCommentText(raw: unknown): string {
  const text = typeof raw === 'string' ? raw.replace(/\r\n/g, '\n').replace(CTRL, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : ''
  if (text.length < LIMITS.commentMin) throw new VisitorError('Der Kommentar ist zu kurz.')
  if (text.length > LIMITS.commentMax) throw new VisitorError(`Der Kommentar ist zu lang (höchstens ${LIMITS.commentMax} Zeichen).`)
  const links = text.match(/(https?:\/\/|www\.)\S+/gi) || []
  if (links.length > LIMITS.maxLinks) throw new VisitorError(`Höchstens ${LIMITS.maxLinks} Links pro Kommentar.`)
  return text
}
