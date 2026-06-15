import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = { timeoutMinutes: 5 }

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'session', scope: 'global' }
    }))
    return { session: result.Item || DEFAULTS }
  } catch {
    return { session: DEFAULTS }
  }
})
