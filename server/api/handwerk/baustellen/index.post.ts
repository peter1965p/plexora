import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const baustelleId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    baustelleId,
    customerName: body.customerName || '',
    address:      body.address || '',
    description:  body.description || '',
    status:       body.status || 'geplant',
    startDate:    body.startDate || '',
    endDate:      body.endDate || '',
    notes:        body.notes || '',
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-handwerk-baustellen', Item: item }))
  return { baustelle: item }
})
