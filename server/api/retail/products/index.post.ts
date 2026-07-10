import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const productId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    productId,
    name:     body.name || '',
    sku:      body.sku || '',
    price:    Number(body.price) || 0,
    stock:    Number(body.stock) || 0,
    unit:     body.unit || 'Stk',
    category: body.category || '',
    active:   body.active ?? true,
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-retail-products', Item: item }))
  return { product: item }
})
