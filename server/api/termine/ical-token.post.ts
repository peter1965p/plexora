import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { assertNotDemo } from '../../utils/demoPolicy'
import { requireAuth } from '../../utils/verifyAuth'
import { newIcalToken, termineIcalUrl } from '../../utils/termineIcalStore'

// Abo-Link erzeugen oder erneuern. Ein neuer Link macht den alten sofort ungültig (z. B. wenn er versehentlich weitergegeben wurde).
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const tenantId = await requireTenantId(event)
  const token = newIcalToken()
  await getDynamoClient().send(new UpdateCommand({ TableName: 'plexora-nexora', Key: { tenantId }, UpdateExpression: 'SET termineIcalToken = :t, updatedAt = :u', ConditionExpression: 'attribute_exists(tenantId)', ExpressionAttributeValues: { ':t': token, ':u': new Date().toISOString() } }))
  return { url: termineIcalUrl(tenantId, token) }
})
