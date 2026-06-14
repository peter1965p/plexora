import { PutCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

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

  // Bereits konvertiert? -> idempotent zurückgeben
  if (existing.customerId) {
    return { success: true, alreadyConverted: true, customerId: existing.customerId }
  }

  const customerId = randomUUID()
  const convertedAt = new Date().toISOString()

  const customer = {
    userId:     existing.userId,
    customerId,
    contactId:  existing.contactId,
    firstName:  existing.firstName,
    lastName:   existing.lastName,
    email:      existing.email,
    company:    existing.company || '',
    companyId:  existing.companyId || '',
    phone:      existing.phone || '',
    created:    convertedAt,
  }

  await client.send(new PutCommand({ TableName: 'plexora-customers', Item: customer }))

  await client.send(new UpdateCommand({
    TableName: 'plexora-contacts',
    Key: { userId: existing.userId, contactId },
    UpdateExpression: 'SET customerId = :cid, convertedAt = :ca, #st = :st',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':cid': customerId,
      ':ca':  convertedAt,
      ':st':  'customer',
    }
  }))

  return { success: true, customerId, customer }
})
