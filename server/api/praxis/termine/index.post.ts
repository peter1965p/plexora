import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const terminId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    terminId,
    patientId: body.patientId || '',
    date:      body.date || '',
    startTime: body.startTime || '',
    endTime:   body.endTime || '',
    reason:    body.reason || '',
    status:    body.status || 'geplant',
    notes:     body.notes || '',
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-praxis-termine', Item: item }))
  return { termin: item }
})
