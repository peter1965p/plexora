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
      settingId: 'theme',
      scope:     'global',
      theme:     body.theme || 'dark',
      accent:    body.accent    || '#6C3FE8',
      accentRgb: body.accentRgb || '234, 88, 12',
      updated:   new Date().toISOString(),
    }
  }))

  return { success: true }
})
