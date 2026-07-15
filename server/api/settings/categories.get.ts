import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS: Record<string, string[]> = {
  blog: [],
  shop: ['SOFTWARE', 'SERVICE'],
}

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const client = getDynamoClient()
  try {
    const scope  = await resolveUserId(auth.email)
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'categories', scope },
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
