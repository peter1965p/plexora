import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = { activeThemeId: '' }

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'frontend-theme', scope: 'global' }
    }))
    return { frontendTheme: result.Item || DEFAULTS }
  } catch {
    return { frontendTheme: DEFAULTS }
  }
})
