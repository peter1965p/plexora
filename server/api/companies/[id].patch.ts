import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const companyId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const client    = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-companies',
    FilterExpression: 'companyId = :id',
    ExpressionAttributeValues: { ':id': companyId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Unternehmen nicht gefunden' })

  await client.send(new UpdateCommand({
    TableName: 'plexora-companies',
    Key: { userId: existing.userId, companyId },
    UpdateExpression: 'SET #nm = :nm, website = :ws, branche = :br, email = :em, phone = :ph, street = :st, zip = :zp, city = :ct, country = :co, notes = :no',
    ExpressionAttributeNames: { '#nm': 'name' },
    ExpressionAttributeValues: {
      ':nm': body.name,
      ':ws': body.website || '',
      ':br': body.branche || '',
      ':em': body.email || '',
      ':ph': body.phone || '',
      ':st': body.street || '',
      ':zp': body.zip || '',
      ':ct': body.city || '',
      ':co': body.country || '',
      ':no': body.notes || '',
    }
  }))

  return { success: true }
})
