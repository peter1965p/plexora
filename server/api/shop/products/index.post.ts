import { resolveUserId } from '../../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()
  const product = {
    userId: await resolveUserId(event.context.auth?.email || 'demo-user'),
    productId:   randomUUID(),
    name:        body.name,
    description: body.description || '',
    price:       Number(body.price),
    currency:    body.currency || 'eur',
    category:    body.category || 'general',
    image:       body.image || '',
    stock:       Number(body.stock) || 0,
    status:      body.status || 'active',
    sku:         body.sku || '',
    unit:        body.unit || 'Stk',
    minStock:    body.minStock ?? 10,
    vatRate:     body.vatRate ?? 19,
    supplierId:  body.supplierId || '',
    created:     new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-products', Item: product }))
  return { success: true, product }
})
