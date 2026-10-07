import { redeemSetPasswordToken, restoreSetPasswordToken, TOKEN_RE } from '../../utils/welcomeToken'
import { getUserStatus, setPermanentPassword } from '../../utils/cognitoPending'
import { enforcePublicRateLimit, checkRateLimit } from '../../utils/rateLimit'
import { passwordProblem } from '../../../shared/passwordRules'
import { sendMail } from '../../utils/mailer'
import { renderPasswordSetMail } from '../../utils/welcomeMail'
import { createHash } from 'node:crypto'

// Passwort per Einmal-Link festlegen (nach einem Kauf, kein Passwort in der Mail). Öffentlich, weil der Kunde noch nicht angemeldet sein kann.
// Das Token (256 Bit, 60 Minuten, einmalig, nur als Hash gespeichert) ist der Nachweis. Es wird erst nach der Passwortprüfung verbraucht und
// zurückgegeben, wenn nur das Passwort abgelehnt wurde. Das Passwort wird nie gespeichert oder protokolliert; die Antwort enthält keine Kontodaten.
const INVALID = 'Dieser Link ist ungültig oder abgelaufen. Du kannst unten einen neuen anfordern.'
const bad = (statusCode: number, code: string, message: string) => createError({ statusCode, message, data: { code } })

export default defineEventHandler(async (event) => {
  await enforcePublicRateLimit(event, 'set-password', { perMinute: 5, perDay: 30 })
  const body: any = await readBody(event).catch(() => ({}))
  const token = typeof body?.token === 'string' ? body.token : ''
  const password = body?.password
  if (!TOKEN_RE.test(token)) throw bad(400, 'LINK_INVALID', INVALID)
  // Falsche Versuche mit demselben Token bremsen (ein geratenes Token trifft praktisch nie, aber es kostet nichts)
  const tokenHash = createHash('sha256').update(token).digest('hex').slice(0, 24)
  if (!(await checkRateLimit('set-password:token', tokenHash, 10, 3600))) throw bad(429, 'LINK_INVALID', 'Zu viele Versuche. Bitte fordere einen neuen Link an.')
  const problem = passwordProblem(password)
  if (problem) throw bad(400, 'PASSWORD_RULES', problem)

  const rec = await redeemSetPasswordToken(token)
  if (!rec) throw bad(400, 'LINK_INVALID', INVALID)

  // Nur Konten, die auf ihr erstes Passwort warten: ein Link darf nie das Passwort eines schon eingerichteten Kontos überschreiben
  let user
  try { user = await getUserStatus(rec.username) } catch (e) { console.error('[set-password] Konto nicht prüfbar:', (e as Error)?.message); await restoreSetPasswordToken(token, rec); throw bad(503, 'TEMPORARY', 'Das Passwort konnte gerade nicht gesetzt werden. Bitte versuche es gleich noch einmal.') }
  if (!user || !user.enabled || user.status !== 'FORCE_CHANGE_PASSWORD') throw bad(400, 'ALREADY_SET', 'Für dieses Konto ist bereits ein Passwort festgelegt. Bitte melde dich an oder nutze „Passwort vergessen“.')

  try { await setPermanentPassword(rec.username, password as string) } catch (e: any) {
    if (e?.name === 'InvalidPasswordException') { await restoreSetPasswordToken(token, rec); throw bad(400, 'PASSWORD_RULES', 'Dieses Passwort wird nicht akzeptiert. Bitte wähle ein anderes.') }
    console.error('[set-password] AdminSetUserPassword fehlgeschlagen:', e?.name)
    await restoreSetPasswordToken(token, rec)
    throw bad(503, 'TEMPORARY', e?.name === 'AccessDeniedException' || e?.name === 'NotAuthorizedException' ? 'Diese Funktion ist noch nicht freigeschaltet. Bitte wende dich an billing@plexora.eu.' : 'Das Passwort konnte gerade nicht gesetzt werden. Bitte versuche es gleich noch einmal.')
  }

  // Hinweis ohne Link, damit ein Missbrauch auffällt; ein Fehler hier ändert nichts am Ergebnis
  try { const m = renderPasswordSetMail(); await sendMail({ userId: rec.email, kind: 'welcome', from: 'Plexora <billing@plexora.eu>', to: rec.email, subject: m.subject, html: m.html, text: m.text }) } catch { /* ignorieren */ }
  return { success: true }
})
