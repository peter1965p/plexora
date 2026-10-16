import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { loadSite, requireVisitor, VISITORS_TABLE } from '../../../../utils/siteVisitor'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'visitor-logout')
  const tenantId = String(getRouterParam(event, 'tenantId') || '')
  await loadSite(tenantId)
  const body: any = await readBody(event).catch(() => ({}))
  const v = await requireVisitor(body?.token, tenantId)
  await getDynamoClient().send(new DeleteCommand({ TableName: VISITORS_TABLE, Key: { tenantId, sk: v.sessionSk } }))
  return { ok: true }
})
