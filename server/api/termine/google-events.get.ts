import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { listGoogleCalendarEvents } from '../../utils/termine'

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const query = getQuery(event)
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const item = res.Items?.[0]
  if (!item) return { events: [] }

  const now = new Date()
  const timeMin = query.timeMin ? String(query.timeMin) : now.toISOString()
  const maxDate = new Date(now)
  maxDate.setDate(maxDate.getDate() + (Number(query.days) || 30))
  const timeMax = query.timeMax ? String(query.timeMax) : maxDate.toISOString()

  try {
    const events = await listGoogleCalendarEvents(item, { timeMin, timeMax })
    return { events }
  } catch (e: any) {
    return { events: [], error: e?.message || 'Google-Kalender konnte nicht geladen werden' }
  }
})
