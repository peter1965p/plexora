import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getDynamoClient()
  const invoice = {
    userId:    body.userId || 'demo-user',
    invoiceId: randomUUID(),
    number:    body.number || 'INV-' + Date.now(),
    client:    body.client,
    amount:    body.amount,
    status:    body.status || 'pending',
    dueDate:   body.dueDate,
    created:   new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-finance', Item: invoice }))
  return { success: true, invoice }
})
