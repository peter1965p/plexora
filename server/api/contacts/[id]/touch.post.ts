import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const contactId = getRouterParam(event, 'id')
  const client     = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-contacts',
    FilterExpression: 'contactId = :id',
    ExpressionAttributeValues: { ':id': contactId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Kontakt nicht gefunden' })

  await client.send(new UpdateCommand({
    TableName: 'plexora-contacts',
    Key: { userId: existing.userId, contactId },
    UpdateExpression: 'SET accessCount = if_not_exists(accessCount, :zero) + :inc, lastAccessedAt = :now',
    ExpressionAttributeValues: {
      ':zero': 0,
      ':inc':  1,
      ':now':  new Date().toISOString(),
    }
  }))

  return { success: true }
})
