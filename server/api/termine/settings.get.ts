import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULT_HOURS = {
  mon: { enabled: true,  start: '09:00', end: '17:00' },
  tue: { enabled: true,  start: '09:00', end: '17:00' },
  wed: { enabled: true,  start: '09:00', end: '17:00' },
  thu: { enabled: true,  start: '09:00', end: '17:00' },
  fri: { enabled: true,  start: '09:00', end: '17:00' },
  sat: { enabled: false, start: '09:00', end: '13:00' },
  sun: { enabled: false, start: '09:00', end: '13:00' },
}

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  const item = res.Items?.[0]
  return {
    tenantId: item?.tenantId || '',
    settings: {
      termineEnabled:         item?.termineEnabled         ?? false,
      termineTitle:           item?.termineTitle            || 'Termine',
      termineTimezone:        item?.termineTimezone         || 'Europe/Berlin',
      termineWorkingHours:    item?.termineWorkingHours     || DEFAULT_HOURS,
      termineSlotStepMinutes: item?.termineSlotStepMinutes  ?? 30,
      termineMinNoticeHours:  item?.termineMinNoticeHours   ?? 2,
      termineMaxAdvanceDays:  item?.termineMaxAdvanceDays   ?? 60,
      googleConnected:        item?.googleConnected         ?? false,
      googleEmail:            item?.googleEmail             || '',
    },
  }
})
