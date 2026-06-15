import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId: 'theme',
      scope:     'global',
      theme:     body.theme === 'light' ? 'light' : 'dark',
      accent:    body.accent    || '#6C3FE8',
      accentRgb: body.accentRgb || '108, 63, 232',
      updated:   new Date().toISOString(),
    }
  }))

  return { success: true }
})
