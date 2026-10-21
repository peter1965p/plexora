import { requireAuth } from '../../utils/verifyAuth'
import { isDemoAccount } from '../../utils/mailGuard'
import { resetDemo } from '../../utils/demoSandbox'

// Setzt das Demo-Konto auf den Standard zurück. Nur das Demo-Konto selbst darf das auslösen (beim Abmelden und beim Start der Demo); es betrifft nur dessen Daten.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  if (!isDemoAccount(auth)) throw createError({ statusCode: 403, message: 'Nur im Demo-Zugang.' })
  return await resetDemo()
})
