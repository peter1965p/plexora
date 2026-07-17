import { requireAuth } from '../../../../utils/verifyAuth'
import { resolveUserId } from '../../../../utils/tenant'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { compileNewsletterHtml } from '../../../../utils/newsletterHtml'
import { Resend } from 'resend'

export default defineEventHandler(async (event) => {
  const auth       = requireAuth(event)
  const tenantId   = await resolveUserId(auth.email)
  const campaignId = getRouterParam(event, 'id') || ''
  const dynamo     = getDynamoClient()

  const campaignRes = await dynamo.send(new GetCommand({
    TableName: 'plexora-newsletter-campaigns',
    Key: { tenantId, campaignId },
  }))
  const campaign = campaignRes.Item
  if (!campaign) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })

  const [settingsRes, brandingRes] = await Promise.all([
    dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'newsletter', scope: tenantId } })),
    dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantId } })),
  ])
  const senderSettings = settingsRes.Item || { senderName: '', replyTo: '', impressum: '' }
  const branding       = brandingRes.Item || { brandName: 'Plexora' }

  const apiBase = useRuntimeConfig().public.apiBase as string
  const html = compileNewsletterHtml({
    bodyHtml: campaign.bodyHtml || '',
    header:   { companyName: branding.brandName },
    footer:   { impressum: senderSettings.impressum || '', unsubscribeUrl: `${apiBase}/api/public/newsletter/unsubscribe/test` },
    apiBase,
  })

  const resend = new Resend(useRuntimeConfig().resendApiKey as string)
  const fromName = senderSettings.senderName ? `${senderSettings.senderName} via Plexora` : 'Plexora Newsletter'
  await resend.emails.send({
    from:    `${fromName} <newsletter@plexora.eu>`,
    to:      auth.email,
    replyTo: senderSettings.replyTo || undefined,
    subject: `[TEST] ${campaign.subject || campaign.name}`,
    html,
  })

  return { success: true }
})
