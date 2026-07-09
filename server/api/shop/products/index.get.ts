import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'

// Nur für den eingeloggten Tenant selbst (shop-admin.vue) — die öffentliche Sicht auf
// Produkte läuft jetzt über server/api/public/[tenantId]/shop/index.get.ts.
export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const client = getDynamoClient()
  try {
    const result = await client.send(new QueryCommand({
      TableName: 'plexora-products',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    }))
    return { products: result.Items || [] }
  } catch {
    return { products: [] }
  }
})
