import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { randomUUID } from 'crypto'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'

export default defineEventHandler(async (event) => {
  await enforcePublicRateLimit(event, 'portal-comment')
  const token  = getRouterParam(event, 'token')
  const body   = await readBody(event)
  const client = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-support',
    FilterExpression: 'portalToken = :t',
    ExpressionAttributeValues: { ':t': token },
  }))
  const ticket = scan.Items?.[0]
  if (!ticket) throw createError({ statusCode: 404 })

  const comment = {
    id: randomUUID(), author: body.name || 'Kunde',
    text: body.text, created: new Date().toISOString(), isCustomer: true,
  }
  await client.send(new UpdateCommand({
    TableName: 'plexora-support',
    Key: { userId: ticket.userId, ticketId: ticket.ticketId },
    UpdateExpression: 'SET comments = list_append(if_not_exists(comments, :empty), :c)',
    ExpressionAttributeValues: { ':empty': [], ':c': [comment] },
  }))
  return { success: true }
})
