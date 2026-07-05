import { Resend } from 'resend'
import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

const FOLLOWUP_TEMPLATES: Record<string, { subject: string; body: (name: string) => string }> = {
  'not-opened-3d': {
    subject: 'Haben Sie unsere E-Mail gesehen?',
    body: (name) => `<p>Hallo${name ? ' ' + name : ''},</p>
<p>wir wollten kurz nachfragen, ob Sie unsere letzte E-Mail erhalten haben.</p>
<p>Falls Sie Fragen haben oder mehr erfahren möchten — wir sind gerne für Sie da!</p>`,
  },
  'opened-not-clicked-3d': {
    subject: 'Noch Fragen? Wir helfen gerne!',
    body: (name) => `<p>Hallo${name ? ' ' + name : ''},</p>
<p>Sie haben sich unser Angebot angeschaut — haben Sie noch offene Fragen?</p>
<p>Wir beraten Sie gerne persönlich und kostenlos.</p>`,
  },
  'clicked-not-converted-7d': {
    subject: 'Jetzt Demo buchen — kostenlos & unverbindlich',
    body: (name) => `<p>Hallo${name ? ' ' + name : ''},</p>
<p>Sie haben unser Angebot bereits näher angesehen — jetzt wäre der perfekte Moment für ein kurzes Demo-Gespräch!</p>
<p>Buchen Sie jetzt Ihren kostenlosen Termin. Es dauert nur 15 Minuten.</p>`,
  },
}

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const config = useRuntimeConfig()
  const dynamo = getDynamoClient()
  const resend = new Resend(config.resendApiKey as string)
  const now    = Date.now()
  let followupsSent = 0

  const result = await dynamo.send(new ScanCommand({ TableName: 'plexora-email-sends' }))
  const sends  = result.Items || []

  for (const send of sends) {
    if (send.followupLevel > 0) continue
    if (!send.email) continue

    const daysSince = (now - new Date(send.sentAt).getTime()) / 86_400_000
    const firstName = (send.contactName || '').split(' ')[0]

    let templateKey: string | null = null
    if (daysSince >= 3 && send.status === 'sent')    templateKey = 'not-opened-3d'
    if (daysSince >= 3 && send.status === 'opened')  templateKey = 'opened-not-clicked-3d'
    if (daysSince >= 7 && send.status === 'clicked') templateKey = 'clicked-not-converted-7d'

    if (!templateKey) continue

    const tmpl = FOLLOWUP_TEMPLATES[templateKey]
    try {
      await resend.emails.send({
        from: 'Plexora <marketing@plexora.eu>',
        to: send.email,
        subject: tmpl.subject,
        html: `<!DOCTYPE html><html lang="de"><body style="font-family:Arial,sans-serif;background:#f5f5f7;margin:0;padding:20px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
  ${tmpl.body(firstName)}
  <div style="margin-top:24px">
    <a href="https://app.plexora.eu" style="background:#6C3FE8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
      Jetzt anfragen →
    </a>
  </div>
  <p style="color:#aaa;font-size:11px;margin-top:28px">Um sich abzumelden, antworten Sie mit "Abmelden".</p>
</div>
</body></html>`,
        tags: [
          { name: 'campaignId', value: send.campaignId || '' },
          { name: 'contactId',  value: send.contactId  || '' },
        ],
      })

      await dynamo.send(new UpdateCommand({
        TableName: 'plexora-email-sends',
        Key: { campaignId: send.campaignId, contactId: send.contactId },
        UpdateExpression: 'SET followupLevel = :l, followupSentAt = :t, followupType = :ft',
        ExpressionAttributeValues: { ':l': 1, ':t': new Date().toISOString(), ':ft': templateKey },
      }))

      followupsSent++
    } catch (e) {
      console.error('Followup failed', send.contactId, e)
    }
  }

  return { followupsSent, checked: sends.length }
})
