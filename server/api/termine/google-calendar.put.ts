import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = await readBody(event)
  const calendarIds = Array.isArray(body?.calendarIds)
    ? [...new Set(body.calendarIds.map((id: unknown) => String(id).trim()).filter(Boolean))] as string[]
    : []
  if (!calendarIds.length) throw createError({ statusCode: 400, message: 'Mindestens ein Kalender muss aktiv sein' })

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
    UpdateExpression: 'SET googleCalendarIds = :ids, googleCalendarId = :c',
    ExpressionAttributeValues: { ':ids': calendarIds, ':c': calendarIds[0] },
  }))
  return { success: true, calendarIds }
})
