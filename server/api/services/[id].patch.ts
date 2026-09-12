import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId    = await resolveUserId(email)
  const serviceId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const dynamo    = getDynamoClient()

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-services',
    Key: { userId, serviceId },
    UpdateExpression: 'SET #n = :n, price = :p, description = :d, unit = :u, vatRate = :v, updated = :up',
    ExpressionAttributeNames: { '#n': 'name' },
    ExpressionAttributeValues: {
      ':n':  body.name,
      ':p':  Number(body.price) || 0,
      ':d':  body.description || '',
      ':u':  body.unit || 'Stk',
      ':v':  body.vatRate ?? 19,
      ':up': new Date().toISOString(),
    },
  }))
  return { success: true }
})
