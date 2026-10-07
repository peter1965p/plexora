import { requireAuth } from '../../utils/verifyAuth'
import { assertNotDemo } from '../../utils/demoPolicy'
import { createTicket } from '../../utils/oneTimeTicket'

// Startet die Google-Kalender-Verknüpfung: aus der angemeldeten Anfrage (Authorization-Header) entsteht ein 60 Sekunden gültiger Einmalwert,
// mit dem der Browser danach zu /api/termine/google-auth navigiert. Das Anmeldetoken selbst steht nie in einer Adresse.
export default defineEventHandler((event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang kann kein Google-Kalender verknüpft werden.')
  if (!auth.email || !auth.userId) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  const ticket = createTicket({ userId: auth.userId, email: auth.email }, 'google-auth')
  const apiBase = String(useRuntimeConfig().public.apiBase || '')
  return { url: `${apiBase}/api/termine/google-auth?ticket=${encodeURIComponent(ticket)}` }
})
