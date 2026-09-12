import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'

// Allgemeiner Leistungs-/Produktkatalog fürs Business (Finance-Modul), getrennt vom Webshop-Katalog.
export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const client = getDynamoClient()
  try {
    const result = await client.send(new QueryCommand({
      TableName: 'plexora-services',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    }))
    return { services: result.Items || [] }
  } catch {
    return { services: [] }
  }
})
