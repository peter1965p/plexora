import { sendDueTerminReminders } from '../../../utils/termineReminders'

// Aufruf nur durch die EventBridge-Regel plexora-termine-reminders (kein Cognito-Token).
// Der Pfad steht exakt in PUBLIC_PATTERNS der Auth-Middleware, hier zusätzlich das Secret.
export default defineEventHandler(async (event) => {
  const secret = getHeader(event, 'x-internal-cron-secret')
  if (!secret || secret !== useRuntimeConfig().newsletterCronSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return await sendDueTerminReminders()
})
