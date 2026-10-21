import { requireAuth } from '../../utils/verifyAuth'
import { isDemoAccount } from '../../utils/mailGuard'
import { resetDemo } from '../../utils/demoSandbox'

// Setzt das eigene Demo-Konto auf den Standard zurück (nur Demo-Konten, nur deren Daten). release = danach für den nächsten Besucher freigeben (beim Abmelden).
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  if (!isDemoAccount(auth)) throw createError({ statusCode: 403, message: 'Nur im Demo-Zugang.' })
  const body: any = await readBody(event).catch(() => ({}))
  return await resetDemo({ email: auth.email.toLowerCase(), release: body?.release === true })
})
