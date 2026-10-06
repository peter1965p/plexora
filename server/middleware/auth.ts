import { verifyBearerToken } from '../utils/verifyAuth'
import { findPublicRule } from '../utils/routePolicy'

// Welche Routen bewusst ohne Anmeldung erreichbar sind, steht mit Begründung in server/utils/routePolicy.ts
// (gleiche Quelle wie der Routen-Test).

export default defineEventHandler(async (event) => {
  const path = event.path || ''
  if (!path.startsWith('/api/')) return
  const method = (event.method || 'GET').toUpperCase()
  const rule = findPublicRule(path, method)
  // Bisherige öffentliche Routen: unverändert, Token wird nicht gelesen
  if (rule && !rule.optionalAuth) return

  const auth = await verifyBearerToken(event)
  if (auth) event.context.auth = auth
  // Öffentliche Routen mit optionalem Token (Entwürfe des Besitzers, Firmendaten angemeldeter Mandanten): nie ablehnen
  if (rule) return

  // Etappenweiser Rollout: erst wenn das Frontend überall echte Tokens mitschickt,
  // wird hier hart durchgesetzt. Einzelne Routen (aws/*, licenses, admin/*) erzwingen
  // Auth schon jetzt selbst über requireAuth()/requireAdmin(), unabhängig von diesem Flag.
  const enforce = useRuntimeConfig().authEnforce === 'true' || useRuntimeConfig().authEnforce === true
  if (enforce && !auth) {
    throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  }
})
