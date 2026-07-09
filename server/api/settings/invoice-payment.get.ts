import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'

const DEFAULTS = { sepaEnabled: true, stripeEnabled: true }

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const scope = await resolveUserId(email)
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'invoice-payment', scope }
    }))
    return { settings: { ...DEFAULTS, ...result.Item } }
  } catch {
    return { settings: DEFAULTS }
  }
})
