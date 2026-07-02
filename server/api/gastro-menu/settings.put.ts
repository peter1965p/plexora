import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body   = await readBody(event)
  const dynamo = getDynamoClient()

  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  const item = res.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId: item.tenantId },
    UpdateExpression: 'SET menuEnabled = :me, menuTitle = :mt, orderingEnabled = :oe, updatedAt = :u',
    ExpressionAttributeValues: {
      ':me': body.menuEnabled     ?? false,
      ':mt': body.menuTitle       || 'Speisekarte',
      ':oe': body.orderingEnabled ?? false,
      ':u':  new Date().toISOString(),
    },
  }))

  return { success: true }
})
