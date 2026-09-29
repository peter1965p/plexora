import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const body   = await readBody(event)
  const client = getDynamoClient()
  const article = {
    userId:      await resolveUserId(email),
    articleId:   randomUUID(),
    name:        body.name,
    description: body.description || '',
    sku:         body.sku || '',
    category:    body.category || '',
    price:       Number(body.price) || 0,
    unit:        body.unit || 'Stk',
    vatRate:     body.vatRate ?? 19,
    created:     new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-articles', Item: article }))
  return { success: true, article }
})
