import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const projectId = getRouterParam(event, 'id')
  const client    = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-projects',
    FilterExpression: 'projectId = :id',
    ExpressionAttributeValues: { ':id': projectId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Projekt nicht gefunden' })

  await client.send(new DeleteCommand({
    TableName: 'plexora-projects',
    Key: { userId: existing.userId, projectId }
  }))

  return { success: true }
})
