import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = { dueDays: 7, dueText: 'Zahlbar innerhalb von 7 Tagen netto', vatRate: 19, priceDisplay: 'netto', smallBusiness: false }

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'invoice', scope: 'global' }
    }))
    return { settings: { ...DEFAULTS, ...result.Item } }
  } catch {
    return { settings: DEFAULTS }
  }
})
