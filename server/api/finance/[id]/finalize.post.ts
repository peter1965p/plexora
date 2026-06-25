import { resolveUserId } from '../../../utils/tenant'
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const userId    = await resolveUserId(body.userId || 'demo-user')
  const client    = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'invoiceId = :id',
    ExpressionAttributeValues: { ':id': invoiceId },
  }))
  if (!scan.Items?.[0]) throw createError({ statusCode: 404 })

  await client.send(new UpdateCommand({
    TableName: 'plexora-finance',
    Key: { userId, invoiceId },
    UpdateExpression: 'SET finalizedAt = :t, finalizedBy = :u',
    ExpressionAttributeValues: { ':t': new Date().toISOString(), ':u': userId },
  }))
  return { success: true }
})
