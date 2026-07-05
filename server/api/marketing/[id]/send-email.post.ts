import { Resend } from 'resend'
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { resolveUserId } from '../../../utils/tenant'
import { generateEmailContent, buildEmailHtml, resolveAnthropicApiKey, replacePlaceholders, textToHtmlParagraphs } from '../../../utils/marketingEmail'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { subject, tone = 'freundlich', contactFilter = {}, mode = 'ai', manualSubject, manualBody } = body || {}

  const config = useRuntimeConfig()
  const dynamo = getDynamoClient()
  const tenantId = await resolveUserId(event.context.auth?.email || 'demo-user')

  // Load campaign (tenantId = partition key "userId", campaignId = sort key)
  const campaignRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-marketing',
    KeyConditionExpression: 'userId = :uid AND campaignId = :cid',
    ExpressionAttributeValues: { ':uid': tenantId, ':cid': campaignId },
  }))
  const campaign = campaignRes.Items?.[0]
  if (!campaign) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })

  // Load contacts
  let contacts = (await dynamo.send(new QueryCommand({
    TableName: 'plexora-contacts',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': tenantId },
  }))).Items || []

  // Filter
  if (contactFilter.status) contacts = contacts.filter((c: any) => c.status === contactFilter.status)
  contacts = contacts.filter((c: any) => c.email)
  if (contacts.length === 0) return { sent: 0, total: 0, failed: [], message: 'Keine Kontakte mit E-Mail-Adresse gefunden' }

  const anthropicApiKey = mode === 'ai' ? await resolveAnthropicApiKey(tenantId, config.anthropicApiKey as string) : ''

  const resend = new Resend(config.resendApiKey as string)
  let sentCount = 0
  const failed: Array<{ contactId: string; name: string; email: string; error: string }> = []

  for (const contact of contacts) {
    const firstName = contact.firstName || ''
    const contactName = `${firstName} ${contact.lastName || ''}`.trim()
    try {
      let emailSubject: string
      let emailBody: string

      if (mode === 'manual') {
        emailSubject = replacePlaceholders(manualSubject || '', contact)
        emailBody = textToHtmlParagraphs(replacePlaceholders(manualBody || '', contact))
      } else {
        emailBody = await generateEmailContent({
          apiKey: anthropicApiKey,
          campaignTopic: campaign.headline || campaign.name,
          contactName,
          contactCompany: contact.company || '',
          tone,
        })
        emailSubject = subject || `${campaign.name}${campaign.headline ? ' — ' + campaign.headline : ''}`
      }

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
          userId: tenantId,
          email: contact.email,
          contactName,
          status: 'sent',
          sentAt: new Date().toISOString(),
          subject: emailSubject,
          followupLevel: 0,
        },
      }))

      sentCount++
    } catch (e: any) {
      const errorMessage = e?.message || 'Unbekannter Fehler'
      console.error('Email send failed', contact.contactId, e)
      failed.push({ contactId: contact.contactId, name: contactName, email: contact.email, error: errorMessage })

      await dynamo.send(new PutCommand({
        TableName: 'plexora-email-sends',
        Item: {
          campaignId,
          contactId: contact.contactId,
          userId: tenantId,
          email: contact.email,
          contactName,
          status: 'failed',
          errorMessage,
          sentAt: new Date().toISOString(),
          followupLevel: 0,
        },
      }))
    }
  }

  return { sent: sentCount, total: contacts.length, failed }
})
