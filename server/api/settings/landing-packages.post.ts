import { requireAdmin } from '../../utils/verifyAuth'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { parseLandingPackages } from '../../../shared/landingTheme'

// Speichert, welche Branchen-Pakete auf der Startseite erscheinen ("shown": Liste der Schlüssel in Reihenfolge, oder null = alle). Nur Betreiber.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body: any = await readBody(event).catch(() => ({}))
  const shown = parseLandingPackages(body?.shown)
  await getDynamoClient().send(new UpdateCommand({
    TableName: 'plexora-settings', Key: { settingId: 'landing-packages', scope: 'global' },
    UpdateExpression: 'SET shown = :s, updated = :u', ExpressionAttributeValues: { ':s': shown, ':u': new Date().toISOString() },
  }))
  return { success: true, shown }
})
