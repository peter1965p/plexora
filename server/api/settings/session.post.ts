import { demoGuard } from '../../utils/demoGuard'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  demoGuard(body?.userId)
  const client = getDynamoClient()

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:      'session',
      scope:          'global',
      timeoutMinutes: typeof body.timeoutMinutes === 'number' ? body.timeoutMinutes : 5,
      updated:        new Date().toISOString(),
    }
  }))

  return { success: true }
})
