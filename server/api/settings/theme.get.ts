import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = {
  theme: 'dark',
  accent: '#6C3FE8',
  accentRgb: '234, 88, 12',
}

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'theme', scope: 'global' }
    }))
    return { theme: result.Item || DEFAULTS }
  } catch {
    return { theme: DEFAULTS }
  }
})
