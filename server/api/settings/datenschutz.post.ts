import { requireAdmin, requireAuth } from '../../utils/verifyAuth'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertNotDemo } from '../../utils/demoPolicy'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  assertNotDemo(requireAuth(event))
  const client = getDynamoClient()
  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId: 'datenschutz',
      scope: 'global',
      content: body.content || '',
      updated: new Date().toISOString(),
    }
  }))
  return { success: true }
})
