import { demoGuard } from '../../utils/demoGuard'
import { requireAdmin } from '../../utils/verifyAuth'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  demoGuard(body?.userId)
  const client = getDynamoClient()

  if (!body.modules) throw createError({ statusCode: 400, statusMessage: 'modules erforderlich' })

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId: 'modules',
      scope:     'global',
      modules:   JSON.stringify(body.modules),
      updated:   new Date().toISOString(),
    }
  }))

  return { success: true }
})
