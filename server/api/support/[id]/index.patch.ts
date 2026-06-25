import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { resolveUserId } from '../../../utils/tenant'

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

  const updates: string[] = []
  const names: Record<string, string>  = {}
  const values: Record<string, any>    = {}

  if (body.status !== undefined)   { updates.push('#s = :s');   names['#s'] = 'status';   values[':s'] = body.status }
  if (body.assignee !== undefined)  { updates.push('assignee = :a');  values[':a'] = body.assignee }
  if (body.clientEmail !== undefined){ updates.push('clientEmail = :e'); values[':e'] = body.clientEmail }

  if (!updates.length) return { success: true }

  await client.send(new UpdateCommand({
    TableName: 'plexora-support',
    Key: { userId: existing.userId, ticketId },
    UpdateExpression: 'SET ' + updates.join(', '),
    ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
    ExpressionAttributeValues: values,
  }))
  return { success: true }
})
