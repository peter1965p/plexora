import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { listGoogleCalendars, activeCalendarIds } from '../../utils/termine'

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const res = await getDynamoClient().send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const item = res.Items?.[0]
  if (!item?.googleConnected) return { calendars: [], selectedIds: [], error: '' }

  try {
    const calendars = await listGoogleCalendars(item)
    return { calendars, selectedIds: activeCalendarIds(item), error: '' }
  } catch {
    // Ältere Verbindungen haben den Kalender-Scope noch nicht – dann einmal neu verbinden
    return { calendars: [], selectedIds: activeCalendarIds(item), error: 'Kalenderliste konnte nicht geladen werden. Bitte Google einmal neu verbinden.' }
  }
})
