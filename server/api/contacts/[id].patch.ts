import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const contactId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const client    = getDynamoClient()

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
    UpdateExpression: 'SET firstName = :fn, lastName = :ln, email = :em, company = :co, phone = :ph, #st = :st',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':fn': body.firstName,
      ':ln': body.lastName,
      ':em': body.email,
      ':co': body.company,
      ':ph': body.phone || '',
      ':st': body.status,
    }
  }))

  return { success: true }
})
