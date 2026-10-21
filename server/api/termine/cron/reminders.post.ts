import { sendDueTerminReminders } from '../../../utils/termineReminders'
import { demoResetIfIdle } from '../../../utils/demoSandbox'

// Aufruf nur durch die EventBridge-Regel plexora-termine-reminders (kein Cognito-Token).
// Der Pfad steht exakt in PUBLIC_PATTERNS der Auth-Middleware, hier zusätzlich das Secret.
export default defineEventHandler(async (event) => {
  const secret = getHeader(event, 'x-internal-cron-secret')
  if (!secret || secret !== useRuntimeConfig().newsletterCronSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  // Sicherheitsnetz für das Demo-Konto: wurde es verändert und lange nicht mehr benutzt (Fenster einfach geschlossen), wird es zurückgesetzt
  await demoResetIfIdle().catch((e: any) => console.error('[demo] Zurücksetzen nach Leerlauf fehlgeschlagen:', e?.message))
  return await sendDueTerminReminders()
})
