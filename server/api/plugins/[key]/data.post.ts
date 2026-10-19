import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { isPluginKey, MAX_PLUGIN_DATA_BYTES } from '../../../../shared/pluginData'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang nicht möglich.')
  const pluginKey = getRouterParam(event, 'key')
  if (!isPluginKey(pluginKey)) throw createError({ statusCode: 400, message: 'pluginKey ungültig (nur a-z, 0-9, -)' })

  const body = await readBody(event)
  // DynamoDB erlaubt 400 KB je Eintrag; wir bleiben deutlich darunter
  if (JSON.stringify(body?.data ?? null).length > MAX_PLUGIN_DATA_BYTES) throw createError({ statusCode: 413, message: 'Die Plugin-Daten sind zu groß (höchstens 200 KB).' })

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
