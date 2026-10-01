import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const scope = await resolveUserId(auth.email)
  const dynamo = getDynamoClient()
  try {
    const res = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'shortener', scope },
    }))
    return { enabled: res.Item?.enabled ?? false }
  } catch {
    return { enabled: false }
  }
})
