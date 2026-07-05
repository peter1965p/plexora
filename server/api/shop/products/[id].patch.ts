import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const productId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const dynamo    = getDynamoClient()

  const userId = event.context.auth?.email || 'demo-user'
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-products',
    Key: { userId, productId },
    UpdateExpression: 'SET #n = :n, price = :p, category = :c, description = :d, longDescription = :ld, features = :ft, priceModel = :pm, stock = :s, minStock = :ms, image = :img, vatRate = :vr, supplierId = :sid, updated = :u',
    ExpressionAttributeNames: { '#n': 'name' },
    ExpressionAttributeValues: {
      ':n':   body.name,
      ':p':   body.price,
      ':c':   body.category,
      ':d':   body.description || '',
      ':ld':  body.longDescription || '',
      ':ft':  body.features || [],
      ':pm':  body.priceModel || 'einmalig',
      ':s':   body.stock,
      ':ms':  body.minStock || 10,
      ':img': body.image || '',
      ':vr':  body.vatRate ?? 19,
      ':sid': body.supplierId || '',
      ':u':   new Date().toISOString(),
    }
  }))

  return { success: true }
})
