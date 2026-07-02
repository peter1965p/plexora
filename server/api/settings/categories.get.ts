import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS: Record<string, string[]> = {
  blog: [],
  shop: ['SOFTWARE', 'SERVICE'],
}

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'categories', scope: 'global' },
    }))
    const item = result.Item || {}
    const categories: Record<string, string[]> = {}
    for (const area of Object.keys(DEFAULTS)) {
      const stored = item[area]
      categories[area] = Array.isArray(stored) ? stored : DEFAULTS[area]
    }
    return { categories }
  } catch {
    return { categories: DEFAULTS }
  }
})
