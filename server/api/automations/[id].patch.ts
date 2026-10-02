import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// Bewusst nur zum Umbenennen und Ein-/Ausschalten (nicht zum Ändern von Trigger/Aktion) —
// dafür einfach eine neue Automatisierung anlegen und die alte löschen.
export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const automationId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const dynamo = getDynamoClient()

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-automations',
    Key: { userId, automationId },
    UpdateExpression: 'SET enabled = :e, #n = :n',
    ExpressionAttributeNames: { '#n': 'name' },
    ExpressionAttributeValues: {
      ':e': body.enabled !== false,
      ':n': body.name || 'Neue Automatisierung',
    },
  }))
  return { success: true }
})
