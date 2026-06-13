import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()
  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId: 'dunning',
      scope:     'global',
      level1:    body.level1,
      level2:    body.level2,
      level3:    body.level3,
      updated:   new Date().toISOString(),
    }
  }))
  return { success: true }
})
