import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  const scope = await resolveUserId(auth.email)
  const dynamo = getDynamoClient()
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'shortener', scope },
    UpdateExpression: 'SET enabled = :e, updated = :u',
    ExpressionAttributeValues: { ':e': !!body.enabled, ':u': new Date().toISOString() },
  }))
  return { success: true }
})
