import { demoGuard } from '../../utils/demoGuard'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  demoGuard(body?.userId)
  const email = event.context.auth?.email
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const sepaEnabled   = body.sepaEnabled   !== false
  const stripeEnabled = body.stripeEnabled !== false
  if (!sepaEnabled && !stripeEnabled) {
    throw createError({ statusCode: 400, message: 'Mindestens eine Zahlungsart muss aktiv bleiben' })
  }

  const scope  = await resolveUserId(email)
  const client = getDynamoClient()
  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId: 'invoice-payment',
      scope,
      sepaEnabled,
      stripeEnabled,
      updated: new Date().toISOString(),
    }
  }))
  return { success: true }
})
