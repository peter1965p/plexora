import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = { timeoutMinutes: 5 }

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const client = getDynamoClient()
  try {
    const scope  = await resolveUserId(auth.email)
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'session', scope }
    }))
    return { session: result.Item || DEFAULTS }
  } catch {
    return { session: DEFAULTS }
  }
})
