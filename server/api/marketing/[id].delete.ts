import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertOwner } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const client     = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-marketing',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })
  await assertOwner(event, existing)

  await client.send(new DeleteCommand({
    TableName: 'plexora-marketing',
    Key: { userId: existing.userId, campaignId }
  }))

  return { success: true }
})
