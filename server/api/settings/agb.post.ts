import { demoGuard } from '../../utils/demoGuard'
import { requireAdmin } from '../../utils/verifyAuth'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  demoGuard(body?.userId)
  const client = getDynamoClient()
  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId: 'agb',
      scope: 'global',
      content: body.content || '',
      updated: new Date().toISOString(),
    }
  }))
  return { success: true }
})
