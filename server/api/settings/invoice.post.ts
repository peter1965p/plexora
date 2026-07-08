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
      settingId:     'invoice',
      scope:         'global',
      dueDays:       body.dueDays || 7,
      dueText:       body.dueText || 'Zahlbar innerhalb von 7 Tagen netto',
      vatRate:       body.vatRate ?? 19,
      priceDisplay:  body.priceDisplay || 'netto',
      smallBusiness: !!body.smallBusiness,
      updated:       new Date().toISOString(),
    }
  }))
  return { success: true }
})
