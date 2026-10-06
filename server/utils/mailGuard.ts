import { requireAuth, type AuthUser } from './verifyAuth'

// Konto, dessen Zugangsdaten öffentlich auf der Startseite stehen (Demo). Erkannt wird es am verifizierten
// Token (E-Mail bzw. Cognito-Gruppe "demo"), nie an Werten aus dem Request-Body.
export const DEMO_ACCOUNT_EMAIL = 'demo@plexora.eu'

export function isDemoAccount(auth: Pick<AuthUser, 'email' | 'groups'>): boolean {
  return (auth.email || '').toLowerCase() === DEMO_ACCOUNT_EMAIL || (auth.groups || []).includes('demo')
}

/**
 * Einstieg für Routen, die über die Plattform-Domain E-Mails versenden:
 * - Anmeldung ist Pflicht (401, kein Rückfall auf demo-user)
 * - das öffentlich bekannte Demo-Konto darf keine Mails auslösen (403)
 */
export function requireMailSender(event: any): AuthUser {
  const auth = requireAuth(event)
  // Ein verifiziertes Token hat immer E-Mail und Nutzer-ID; fehlt eines, wird nicht gesendet
  if (!auth.email || !auth.userId) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  if (isDemoAccount(auth)) {
    throw createError({ statusCode: 403, message: 'Im Demo-Zugang ist der E-Mail-Versand deaktiviert.' })
  }
  return auth
}

// Genau eine Adresse: keine Leerzeichen, Kommas, Semikolons, spitzen Klammern oder Zeilenumbrüche
// (verhindert mehrere Empfänger und Header-Einschleusung)
const SINGLE_ADDRESS = /^[^\s@,;<>"'()\\]+@[^\s@,;<>"'()\\]+\.[^\s@,;<>"'()\\]+$/

/** Liefert die bereinigte Adresse oder null, wenn der Wert keine einzelne gültige Adresse ist. */
export function validRecipient(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v.length === 0 || v.length > 254) return null
  return SINGLE_ADDRESS.test(v) ? v : null
}
