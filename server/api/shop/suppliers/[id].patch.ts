import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const supplierId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-suppliers',
    Key: { supplierId, userId },
    UpdateExpression: 'SET #n = :n, contact = :c, phone = :p, email = :e, website = :w, address = :a, updated = :u',
    ExpressionAttributeNames: { '#n': 'name' },
    ExpressionAttributeValues: {
      ':n': body.name || '',
      ':c': body.contact || '',
      ':p': body.phone || '',
      ':e': body.email || '',
      ':w': body.website || '',
      ':a': body.address || '',
      ':u': new Date().toISOString(),
    },
  }))
  return { success: true }
})
