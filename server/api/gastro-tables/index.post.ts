import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const tableId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    tableId,
    name:     body.name     || '',
    seats:    body.seats    || '',
    status:   body.status   || 'frei',
    reservation: body.reservation || null,
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-tables', Item: item }))
  return { table: item }
})
