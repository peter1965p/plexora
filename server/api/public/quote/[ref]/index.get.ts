import { findQuoteByRef, loadTenantSettings, publicView } from '../../../../utils/quoteStore'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'

// Angebot per Annahme-Link ansehen (öffentlich, das Geheimnis im Link ist der Nachweis). Antwort: nur das Angebot selbst, keine Besitzer-/Mandantendaten.
// Unbekannt oder falsches Geheimnis: immer dieselbe 404.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' })
  await enforcePublicRateLimit(event, 'quote-view', { perMinute: 20, perDay: 300 })
  const q = await findQuoteByRef(getRouterParam(event, 'ref'))
  if (!q) throw createError({ statusCode: 404, message: 'Dieses Angebot gibt es nicht (mehr) oder der Link ist nicht korrekt.' })
  const s = await loadTenantSettings(String(q.userId))
  return publicView(q, { name: s.branding.brandName || 'Plexora', color: s.branding.primaryColor || '#EA580C', logo: s.branding.logoUrl || '' })
})
