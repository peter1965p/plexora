import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { loadSite, requireVisitor } from '../../../../utils/siteVisitor'

// Wer bin ich? (prüft das gespeicherte Token der Webseite; POST, damit das Token nicht in einer Adresse steht)
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'visitor-me')
  const tenantId = String(getRouterParam(event, 'tenantId') || '')
  await loadSite(tenantId)
  const body: any = await readBody(event).catch(() => ({}))
  const v = await requireVisitor(body?.token, tenantId)
  return { ok: true, name: v.name }
})
