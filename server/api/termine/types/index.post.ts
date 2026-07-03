import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const typeId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    typeId,
    name:            body.name            || '',
    durationMinutes: Number(body.durationMinutes) || 30,
    active:          body.active ?? true,
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-termine-types', Item: item }))
  return { type: item }
})
