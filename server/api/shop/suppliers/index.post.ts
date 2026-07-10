import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const body    = await readBody(event)
  const dynamo  = getDynamoClient()
  const supplierId = randomUUID()
  await dynamo.send(new PutCommand({
    TableName: 'plexora-suppliers',
    Item: { supplierId, userId, ...body, created: new Date().toISOString() }
  }))
  return { success: true, supplierId }
})
