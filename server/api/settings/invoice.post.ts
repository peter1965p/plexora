import { demoGuard } from '../../utils/demoGuard'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  demoGuard(body?.userId)
  const client = getDynamoClient()
  const scope = await resolveUserId(event.context.auth?.email || 'demo-user')
  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:     'invoice',
      scope,
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
