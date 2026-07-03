import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body   = await readBody(event)
  const dynamo = getDynamoClient()

  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  const item = res.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId: item.tenantId },
    UpdateExpression: 'SET termineEnabled = :te, termineTitle = :tt, termineTimezone = :tz, termineWorkingHours = :wh, termineSlotStepMinutes = :ss, termineMinNoticeHours = :mn, termineMaxAdvanceDays = :ma, updatedAt = :u',
    ExpressionAttributeValues: {
      ':te': body.termineEnabled          ?? false,
      ':tt': body.termineTitle             || 'Termine',
      ':tz': body.termineTimezone          || 'Europe/Berlin',
      ':wh': body.termineWorkingHours      || {},
      ':ss': Number(body.termineSlotStepMinutes) || 30,
      ':mn': body.termineMinNoticeHours    ?? 2,
      ':ma': Number(body.termineMaxAdvanceDays)  || 60,
      ':u':  new Date().toISOString(),
    },
  }))

  return { success: true }
})
