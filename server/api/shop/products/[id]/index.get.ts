import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const productId = getRouterParam(event, 'id')
  const client    = getDynamoClient()
  const result    = await client.send(new ScanCommand({
    TableName: 'plexora-products',
    FilterExpression: 'productId = :id',
    ExpressionAttributeValues: { ':id': productId }
  }))
  const product = result.Items?.[0]
  if (!product) throw createError({ statusCode: 404, message: 'Produkt nicht gefunden' })
  return { product }
})
