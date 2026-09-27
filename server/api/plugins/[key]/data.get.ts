import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'

// Generische Datenablage für Zero-Deploy-Plugins: ein JSON-Blob pro Tenant+Plugin.
// Einfache Module (Listen, Einstellungen) brauchen dadurch keine eigene Server-Route.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const pluginKey = getRouterParam(event, 'key')
  if (!pluginKey) throw createError({ statusCode: 400, message: 'pluginKey erforderlich' })

  const dynamo = getDynamoClient()

  // Tenant über die E-Mail auflösen (gleiches Muster wie branch-packages)
  const tenantRes = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': auth.email },
  }))
  const tenantId = tenantRes.Items?.[0]?.tenantId || auth.email

  const result = await dynamo.send(new GetCommand({
    TableName: 'plexora-plugin-data',
    Key: { tenantId, pluginKey },
  }))

  return { data: result.Item?.data ?? null }
})
