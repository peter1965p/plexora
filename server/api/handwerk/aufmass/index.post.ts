import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const aufmassId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    aufmassId,
    baustelleId:  body.baustelleId || '',
    bereich:      body.bereich || '',
    measurements: Array.isArray(body.measurements) ? body.measurements : [],
    notes:        body.notes || '',
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-handwerk-aufmasse', Item: item }))
  return { aufmass: item }
})
