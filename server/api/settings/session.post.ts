import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertNotDemo } from '../../utils/demoPolicy'

// Idle-Timeout ist eine persönliche Einstellung pro Tenant, kein Plattform-weiter
// Wert — daher requireAuth() + scope pro Tenant statt global.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  assertNotDemo(requireAuth(event))
  const scope  = await resolveUserId(auth.email)
  const client = getDynamoClient()

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:      'session',
      scope,
      timeoutMinutes: typeof body.timeoutMinutes === 'number' ? body.timeoutMinutes : 5,
      updated:        new Date().toISOString(),
    }
  }))

  return { success: true }
})
