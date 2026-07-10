import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'

// Tenant-eigene Webshop-Bestellungen (als Verkäufer) — Grundlage für die
// Verkäufe/Retouren-Ansicht in shop-admin.vue. Bislang gab es dafür keine Route.
export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-orders',
    IndexName: 'sellerUserId-index',
    KeyConditionExpression: 'sellerUserId = :s',
    ExpressionAttributeValues: { ':s': userId },
  }))
  const orders = (res.Items || []).sort((a: any, b: any) => (b.created || '').localeCompare(a.created || ''))
  return { orders }
})
