import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const companyId = getRouterParam(event, 'id')
  const client    = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-companies',
    FilterExpression: 'companyId = :id',
    ExpressionAttributeValues: { ':id': companyId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Unternehmen nicht gefunden' })

  await client.send(new DeleteCommand({
    TableName: 'plexora-companies',
    Key: { userId: existing.userId, companyId }
  }))

  return { success: true }
})
