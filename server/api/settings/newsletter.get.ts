import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = { senderName: '', replyTo: '', impressum: '' }

export default defineEventHandler(async (event) => {
  const auth   = requireAuth(event)
  const scope  = await resolveUserId(auth.email)
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'newsletter', scope },
    }))
    return { newsletter: result.Item ? { ...DEFAULTS, ...result.Item } : DEFAULTS }
  } catch {
    return { newsletter: DEFAULTS }
  }
})
