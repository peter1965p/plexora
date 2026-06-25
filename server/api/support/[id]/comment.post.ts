import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const ticketId = getRouterParam(event, 'id')
  const body     = await readBody(event)
  const client   = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-support',
    FilterExpression: 'ticketId = :id',
    ExpressionAttributeValues: { ':id': ticketId },
  }))
  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404 })

  const comment = {
    id:      randomUUID(),
    author:  body.author || 'Agent',
    text:    body.text,
    created: new Date().toISOString(),
    isCustomer: body.isCustomer || false,
  }

  await client.send(new UpdateCommand({
    TableName: 'plexora-support',
    Key: { userId: existing.userId, ticketId },
    UpdateExpression: 'SET comments = list_append(if_not_exists(comments, :empty), :c)',
    ExpressionAttributeValues: { ':empty': [], ':c': [comment] },
  }))
  return { success: true, comment }
})
