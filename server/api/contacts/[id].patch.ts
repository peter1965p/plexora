import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertOwner } from '../../utils/ownership'

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
  await assertOwner(event, existing)

  await client.send(new UpdateCommand({
    TableName: 'plexora-contacts',
    Key: { userId: existing.userId, contactId },
    UpdateExpression: 'SET firstName = :fn, lastName = :ln, email = :em, company = :co, companyId = :cid, phone = :ph, #st = :st, leadSource = :ls, leadStatus = :lst, score = :sc',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: {
      ':fn':  body.firstName,
      ':ln':  body.lastName,
      ':em':  body.email,
      ':co':  body.company || '',
      ':cid': body.companyId ?? existing.companyId ?? '',
      ':ph':  body.phone || '',
      ':st':  body.status,
      ':ls':  body.leadSource ?? existing.leadSource ?? 'manual',
      ':lst': body.leadStatus ?? existing.leadStatus ?? 'new',
      ':sc':  body.score ?? existing.score ?? 0,
    }
  }))

  return { success: true }
})
