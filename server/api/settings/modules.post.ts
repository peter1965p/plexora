import { demoGuard } from '../../utils/demoGuard'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// "Module" ist eine persönliche Ein/Aus-Auswahl pro Tenant (welche lizenzierten
// Module er aktiv nutzen will) — daher requireAuth() + scope pro Tenant statt global.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  demoGuard(body?.userId)
  const scope  = await resolveUserId(auth.email)
  const client = getDynamoClient()

  if (!body.modules) throw createError({ statusCode: 400, statusMessage: 'modules erforderlich' })

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId: 'modules',
      scope,
      modules:   JSON.stringify(body.modules),
      updated:   new Date().toISOString(),
    }
  }))

  return { success: true }
})
