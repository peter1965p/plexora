import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// "Newsletter" ist ein normaler Settings-Tab pro Tenant (Absendername, Reply-To,
// Impressum-Text für den Pflicht-Footer) — requireAuth() + scope pro Tenant, wie
// die übrigen tenant-eigenen Settings (theme, categories, modules, session).
//
// Absichtlich NICHT konfigurierbar: die tatsächliche Versand-Domain (From-Adresse).
// Resend ist nur für @plexora.eu domain-verifiziert — Tenants bekommen ihren Namen
// im Anzeigenamen ("Absendername via Plexora <newsletter@plexora.eu>") und können
// replyTo auf ihre eigene Adresse setzen, damit Antworten bei ihnen landen, aber
// nicht die Envelope-From-Domain selbst wählen (würde bei Resend fehlschlagen).
export default defineEventHandler(async (event) => {
  const auth   = requireAuth(event)
  const body   = await readBody(event)
  const scope  = await resolveUserId(auth.email)
  const client = getDynamoClient()

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:  'newsletter',
      scope,
      senderName: (body.senderName || '').slice(0, 100),
      replyTo:    (body.replyTo    || '').slice(0, 200),
      impressum:  (body.impressum  || '').slice(0, 2000),
      updated:    new Date().toISOString(),
    },
  }))

  return { success: true }
})
