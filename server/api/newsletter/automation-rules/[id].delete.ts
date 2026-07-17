import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth     = requireAuth(event)
  const tenantId = await resolveUserId(auth.email)
  const ruleId   = getRouterParam(event, 'id') || ''
  const dynamo   = getDynamoClient()

  await dynamo.send(new DeleteCommand({
    TableName: 'plexora-newsletter-automation-rules',
    Key: { tenantId, ruleId },
  }))

  return { success: true }
})
