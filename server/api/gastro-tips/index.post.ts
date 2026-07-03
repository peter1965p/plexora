import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const tipId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    tipId,
    staffId:    body.staffId    || '',
    staffName:  body.staffName  || '',
    amount:     body.amount     || 0,
    date:       body.date       || now.slice(0, 10),
    note:       body.note       || '',
    createdAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-gastro-tips', Item: item }))
  return { tip: item }
})
