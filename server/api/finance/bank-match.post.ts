import { resolveUserId } from '../../utils/tenant'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const userId = await resolveUserId(body.userId || 'demo-user')
  const client = getDynamoClient()

  await client.send(new UpdateCommand({
    TableName: 'plexora-bank-txn',
    Key: { userId, txnId: body.txnId },
    UpdateExpression: 'SET matched = :t, invoiceId = :iid',
    ExpressionAttributeValues: { ':t': true, ':iid': body.invoiceId || null },
  }))

  if (body.invoiceId && body.markPaid) {
    await client.send(new UpdateCommand({
      TableName: 'plexora-finance',
      Key: { userId, invoiceId: body.invoiceId },
      UpdateExpression: 'SET #s = :paid',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':paid': 'paid' },
    }))
  }
  return { success: true }
})
