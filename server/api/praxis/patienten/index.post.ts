import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const patientId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    patientId,
    name:      body.name || '',
    birthDate: body.birthDate || '',
    address:   body.address || '',
    phone:     body.phone || '',
    email:     body.email || '',
    insurance: { type: body.insurance?.type || '', provider: body.insurance?.provider || '' },
    notes:     body.notes || '',
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-praxis-patienten', Item: item }))
  return { patient: item }
})
