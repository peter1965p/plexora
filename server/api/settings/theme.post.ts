import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// "Darstellung" ist eine persönliche Präferenz pro Tenant (Dark/Light + Akzentfarbe
// des eigenen Dashboards), kein Admin-only-Feature — requireAuth() + scope pro Tenant.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  const scope  = await resolveUserId(auth.email)
  const client = getDynamoClient()

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId: 'theme',
      scope,
      theme:     body.theme || 'dark',
      accent:    body.accent    || '#6C3FE8',
      accentRgb: body.accentRgb || '234, 88, 12',
      updated:   new Date().toISOString(),
    }
  }))

  return { success: true }
})
