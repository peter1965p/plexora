import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'

// Artikelkatalog (physische Ware) fürs Finance-Modul — eigene Tabelle, getrennt sowohl
// vom Leistungskatalog (plexora-services) als auch vom Webshop-Katalog (plexora-products).
export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const client = getDynamoClient()
  try {
    const result = await client.send(new QueryCommand({
      TableName: 'plexora-articles',
      KeyConditionExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
    }))
    return { articles: result.Items || [] }
  } catch {
    return { articles: [] }
  }
})
