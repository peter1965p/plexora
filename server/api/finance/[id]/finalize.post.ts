import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertOwner } from '../../../utils/ownership'

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'id')
  const client    = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'invoiceId = :id',
    ExpressionAttributeValues: { ':id': invoiceId },
  }))
  const invoice = scan.Items?.[0]
  if (!invoice) throw createError({ statusCode: 404 })
  await assertOwner(event, invoice)

  await client.send(new UpdateCommand({
    TableName: 'plexora-finance',
    Key: { userId: invoice.userId, invoiceId },
    UpdateExpression: 'SET finalizedAt = :t, finalizedBy = :u',
    ExpressionAttributeValues: { ':t': new Date().toISOString(), ':u': invoice.userId },
  }))
  return { success: true }
})
