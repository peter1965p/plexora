import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const staffId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    staffId,
    name:   body.name   || '',
    role:   body.role   || 'Kellner',
    active: body.active ?? true,
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-gastro-staff', Item: item }))
  return { staff: item }
})
