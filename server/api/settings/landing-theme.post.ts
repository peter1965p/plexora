import { requireAdmin } from '../../utils/verifyAuth'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { parseLandingTheme } from '../../../shared/landingTheme'

// Speichert das Design der Startseite. Nur Betreiber (Gruppe admins); gespeichert wird immer die geprüfte Form (nur #rrggbb und Zahlen), nie der Roh-Body.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const theme = parseLandingTheme(await readBody(event).catch(() => ({})))
  await getDynamoClient().send(new UpdateCommand({
    TableName: 'plexora-settings', Key: { settingId: 'landing-theme', scope: 'global' },
    UpdateExpression: 'SET theme = :t, updated = :u', ExpressionAttributeValues: { ':t': theme, ':u': new Date().toISOString() },
  }))
  return { success: true, theme }
})
