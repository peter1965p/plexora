import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { assertNotDemo } from '../../utils/demoPolicy'
import { requireAuth } from '../../utils/verifyAuth'
import { parseCommentsMode } from '../../../shared/siteVisitors'

// Kommentare für die ganze Webseite ein- oder ausschalten: aus, sofort sichtbar, oder erst nach Freigabe. Unbekannte Werte bedeuten "aus".
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const tenantId = await requireTenantId(event)
  const body: any = await readBody(event).catch(() => ({}))
  const mode = parseCommentsMode(body?.mode)
  await getDynamoClient().send(new UpdateCommand({ TableName: 'plexora-nexora', Key: { tenantId }, UpdateExpression: 'SET blogCommentsMode = :m, updatedAt = :u', ConditionExpression: 'attribute_exists(tenantId)', ExpressionAttributeValues: { ':m': mode, ':u': new Date().toISOString() } }))
  return { success: true, mode }
})
