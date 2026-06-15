import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:     'frontend-theme',
      scope:         'global',
      activeThemeId: body.activeThemeId || '',
      updated:       new Date().toISOString(),
    }
  }))

  return { success: true }
})
