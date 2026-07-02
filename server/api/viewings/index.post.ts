import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const viewingId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    viewingId,
    ...body,
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-viewings', Item: item }))
  return { viewing: item }
})
