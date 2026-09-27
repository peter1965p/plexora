import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const pluginKey = getRouterParam(event, 'key')
  if (!pluginKey) throw createError({ statusCode: 400, message: 'pluginKey erforderlich' })

  const body = await readBody(event)

  const dynamo = getDynamoClient()
  const tenantRes = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': auth.email },
  }))
  const tenantId = tenantRes.Items?.[0]?.tenantId || auth.email

  await dynamo.send(new PutCommand({
    TableName: 'plexora-plugin-data',
    Item: { tenantId, pluginKey, data: body?.data ?? null, updatedAt: new Date().toISOString() },
  }))

  return { success: true }
})
