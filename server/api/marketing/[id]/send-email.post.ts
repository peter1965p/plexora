import { Resend } from 'resend'
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { userId, subject, tone = 'freundlich', contactFilter = {} } = body || {}

  const config = useRuntimeConfig()
  const dynamo = getDynamoClient()

  // Load campaign
  const campaignRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-marketing',
    KeyConditionExpression: 'userId = :uid',
    FilterExpression: 'campaignId = :cid',
    ExpressionAttributeValues: { ':uid': userId, ':cid': campaignId },
  }))
  const campaign = campaignRes.Items?.[0]
  if (!campaign) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })

  // Load contacts
  let contacts = (await dynamo.send(new QueryCommand({
    TableName: 'plexora-contacts',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }))).Items || []

  // Filter
  if (contactFilter.status) contacts = contacts.filter((c: any) => c.status === contactFilter.status)
  contacts = contacts.filter((c: any) => c.email)
  if (contacts.length === 0) return { sent: 0, total: 0, message: 'Keine Kontakte mit E-Mail-Adresse gefunden' }

  const resend = new Resend(config.resendApiKey as string)
  let sentCount = 0

  for (const contact of contacts) {
    try {
      const firstName = contact.firstName || ''
      const contactName = `${firstName} ${contact.lastName || ''}`.trim()
      const emailBody = await generateEmailContent({
        apiKey: config.anthropicApiKey as string,
        campaignTopic: campaign.headline || campaign.name,
        contactName,
        contactCompany: contact.company || '',
        tone,
      })

      const emailSubject = subject || `${campaign.name}${campaign.headline ? ' — ' + campaign.headline : ''}`
      const accent = campaign.accentColor || '#6C3FE8'

      await resend.emails.send({
        from: 'Plexora <marketing@plexora.eu>',
        to: contact.email,
        subject: emailSubject,
        html: buildEmailHtml({ contactName, firstName, emailBody, accent, campaignName: campaign.name }),
        tags: [
          { name: 'campaignId', value: campaignId || '' },
          { name: 'contactId', value: contact.contactId || '' },
        ],
      })

      await dynamo.send(new PutCommand({
        TableName: 'plexora-email-sends',
        Item: {
          campaignId,
          contactId: contact.contactId,
          userId,
          email: contact.email,
          contactName,
          status: 'sent',
          sentAt: new Date().toISOString(),
          subject: emailSubject,
          followupLevel: 0,
        },
      }))

      sentCount++
    } catch (e) {
      console.error('Email send failed', contact.contactId, e)
    }
  }

  return { sent: sentCount, total: contacts.length }
})

async function generateEmailContent({ apiKey, campaignTopic, contactName, contactCompany, tone }: any): Promise<string> {
  if (!apiKey) {
    return `<p>Hallo${contactName ? ' ' + contactName.split(' ')[0] : ''},</p>
<p>wir möchten Sie auf unser aktuelles Angebot aufmerksam machen: <strong>${campaignTopic}</strong>.</p>
<p>Nehmen Sie jetzt unverbindlich Kontakt mit uns auf!</p>`
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Du bist ein Marketing-Assistent. Schreibe eine kurze Marketing-E-Mail auf Deutsch.
Thema: ${campaignTopic}
Empfänger: ${contactName || 'Interessent'}${contactCompany ? ', ' + contactCompany : ''}
Ton: ${tone}
Max. 80 Wörter. Nur HTML-Absätze (<p> Tags). Beginne mit "Hallo${contactName ? ' ' + contactName.split(' ')[0] : ''},"`,
        }],
      }),
    })
    const data = await res.json() as any
    return data.content?.[0]?.text || ''
  } catch {
    return `<p>Hallo${contactName ? ' ' + contactName.split(' ')[0] : ''},</p><p>wir freuen uns, Ihnen unser Angebot zu <strong>${campaignTopic}</strong> vorstellen zu dürfen.</p>`
  }
}

function buildEmailHtml({ contactName, firstName, emailBody, accent, campaignName }: any): string {
  return `<!DOCTYPE html>
<html lang="de">
<body style="font-family:Arial,sans-serif;background:#f5f5f7;margin:0;padding:20px">
  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08)">
    <div style="background:${accent};padding:28px 36px">
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px">${campaignName}</div>
    </div>
    <div style="padding:28px 36px;color:#333;font-size:15px;line-height:1.75">
      ${emailBody}
      <div style="margin-top:28px">
        <a href="https://app.plexora.eu"
           style="background:${accent};color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
          Jetzt anfragen →
        </a>
      </div>
    </div>
    <div style="padding:16px 36px;border-top:1px solid #eee;font-size:11px;color:#aaa">
      Sie erhalten diese E-Mail, weil Sie sich für unser Angebot interessiert haben.
      Um sich abzumelden, antworten Sie mit "Abmelden".
    </div>
  </div>
</body>
</html>`
}
