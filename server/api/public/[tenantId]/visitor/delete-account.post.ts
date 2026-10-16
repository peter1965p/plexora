import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { loadSite, requireVisitor, deleteAccountAndComments } from '../../../../utils/siteVisitor'

// Konto und alle eigenen Kommentare löschen (Recht auf Löschung). Verlangt eine gültige Anmeldung und das Wort "LOESCHEN" als Bestätigung.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'visitor-delete')
  const tenantId = String(getRouterParam(event, 'tenantId') || '')
  await loadSite(tenantId)
  const body: any = await readBody(event).catch(() => ({}))
  const v = await requireVisitor(body?.token, tenantId)
  if (body?.confirm !== 'LOESCHEN') throw createError({ statusCode: 400, message: 'Bitte die Löschung bestätigen.' })
  const comments = await deleteAccountAndComments(tenantId, v.email)
  return { ok: true, deletedComments: comments }
})
