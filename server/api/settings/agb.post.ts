import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
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
