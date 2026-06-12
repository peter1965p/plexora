import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const dealId = getRouterParam(event, 'id')
  const client = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-deals',
    FilterExpression: 'dealId = :id',
    ExpressionAttributeValues: { ':id': dealId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Deal nicht gefunden' })

  await client.send(new DeleteCommand({
    TableName: 'plexora-deals',
    Key: { userId: existing.userId, dealId }
  }))

  return { success: true }
})
