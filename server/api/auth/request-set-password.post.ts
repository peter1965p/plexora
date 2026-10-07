import { createHash } from 'node:crypto'
import { enforcePublicRateLimit, checkRateLimit } from '../../utils/rateLimit'
import { findPendingByEmail, isSafeEmail } from '../../utils/cognitoPending'
import { issueSetPasswordToken, SET_PASSWORD_TTL_MINUTES } from '../../utils/welcomeToken'
import { renderNewLinkMail, setPasswordUrl } from '../../utils/welcomeMail'
import { sendMail } from '../../utils/mailer'

// Neuen Link zum Festlegen des Passworts anfordern (der erste ist abgelaufen). Öffentlich, weil der Kunde noch nicht angemeldet sein kann.
// Die Antwort ist IMMER dieselbe (unbekannte Adresse, schon eingerichtetes Konto, Drossel, Fehler): so verrät die Route nicht, welche Adressen ein Konto haben.
// Ein Link wird nur für Konten im Status "wartet auf erstes Passwort" verschickt; eingerichtete Konten nutzen "Passwort vergessen".
const SAME = { success: true, message: 'Falls auf diese Adresse ein Konto wartet, ist eine E-Mail mit einem neuen Link unterwegs.' }

export default defineEventHandler(async (event) => {
  await enforcePublicRateLimit(event, 'set-password-request', { perMinute: 3, perDay: 10 })
  const body: any = await readBody(event).catch(() => ({}))
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : ''
  if (!isSafeEmail(email)) return SAME
  const key = createHash('sha256').update(email).digest('hex').slice(0, 24)
  if (!(await checkRateLimit('set-password-request:addr', key, 3, 3600))) return SAME      // je Adresse höchstens 3 Mails pro Stunde (kein Mail-Bombing)
  try {
    const user = await findPendingByEmail(email)
    if (user) {
      const token = await issueSetPasswordToken(user.username, email)
      const m = renderNewLinkMail({ url: setPasswordUrl(token), minutes: SET_PASSWORD_TTL_MINUTES })
      await sendMail({ userId: email, kind: 'welcome', from: 'Plexora <billing@plexora.eu>', to: email, subject: m.subject, html: m.html, text: m.text })
    }
  } catch (e) { console.error('[set-password-request] fehlgeschlagen:', (e as Error)?.message) }
  return SAME
})
