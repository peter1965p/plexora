import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { resolveTenantEmail, resolveUserId } from '../../../../utils/tenant'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const ownerEmail = await resolveTenantEmail(tenantId)
  if (!ownerEmail) return { products: [] }
  const userId = await resolveUserId(ownerEmail)

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-products',
    KeyConditionExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': userId },
  }))

  const products = (res.Items || [])
    .filter((p: any) => p.status === 'active')
    .map((p: any) => ({
      productId:   p.productId,
      name:        p.name || '',
      description: p.description || '',
      price:       Number(p.price) || 0,
      currency:    'EUR',
      imageUrl:    p.image || '',
      category:    p.category || '',
      available:   (Number(p.stock) ?? 0) > 0,
    }))

  return { products }
})
