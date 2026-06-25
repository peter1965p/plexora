import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const token  = getRouterParam(event, 'token')
  const client = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-support',
    FilterExpression: 'portalToken = :t',
    ExpressionAttributeValues: { ':t': token },
  }))
  const ticket = scan.Items?.[0]
  if (!ticket) throw createError({ statusCode: 404, message: 'Ticket nicht gefunden' })

  return {
    ticketId:  ticket.ticketId,
    title:     ticket.title,
    status:    ticket.status,
    priority:  ticket.priority,
    created:   ticket.created,
    comments:  ticket.comments || [],
  }
})
