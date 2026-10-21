import { requireAuth } from '../../utils/verifyAuth'
import { isDemoAccount } from '../../utils/mailGuard'
import { leaseDemoAccount } from '../../utils/demoSandbox'
import { checkRateLimit } from '../../utils/rateLimit'

// "Demo starten": gibt einem Besucher ein freies Demo-Konto aus dem Pool (eigene Kopie der Daten). Aufruf nur mit dem Ausgangskonto demo@plexora.eu (der Besucher meldet sich damit kurz an und wechselt dann).
// Drossel je Absender-Adresse, damit niemand den Pool leerräumt.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  if (!isDemoAccount(auth)) throw createError({ statusCode: 403, message: 'Nur im Demo-Zugang.' })
  const ip = String(getHeader(event, 'x-forwarded-for') || '').split(',')[0].trim() || 'unbekannt'
  if (!(await checkRateLimit('demo-lease', ip, 12, 3600))) throw createError({ statusCode: 429, message: 'Zu viele Demo-Starts. Bitte später erneut versuchen.' })
  return await leaseDemoAccount()
})
