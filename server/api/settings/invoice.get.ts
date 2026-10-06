import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { requireAuth } from '../../utils/verifyAuth'

const DEFAULTS = { dueDays: 7, dueText: 'Zahlbar innerhalb von 7 Tagen netto', vatRate: 19, priceDisplay: 'netto', smallBusiness: false }

export default defineEventHandler(async (event) => {
  const client = getDynamoClient()
  const scope = await resolveUserId(requireAuth(event).email)
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'invoice', scope }
    }))
    return { settings: { ...DEFAULTS, ...result.Item } }
  } catch {
    return { settings: DEFAULTS }
  }
})
