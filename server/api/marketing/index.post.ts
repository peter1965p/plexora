import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'
import { createCampaignAppointmentType, defaultCampaignEnd } from '../../utils/campaignAppointments'
import { deleteOwnDraftQuietly } from '../../utils/drafts/context'
import { assertBotProtectionAllowed } from '../../utils/botGuard'
import { parseDecorInput } from '../../utils/leadDecorApi'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  const decor = parseDecorInput(event, body)     // Vertrauenspunkte, Datenschutzzeile, Overlays (nur wenn mitgeschickt; Demo 403, ungültig 400)
  const campaign = {
    ...decor,
    userId:         await resolveUserId(requireAuth(event).email),
    campaignId:     randomUUID(),
    name:           body.name || '',
    slug:           body.slug || '',
    formId:         body.formId || '',
    headline:       body.headline || '',
    subtext:        body.subtext || '',
    headerImageUrl: body.headerImageUrl || '',
    accentColor:    body.accentColor || '#6C3FE8',
    bgImageUrl:     body.bgImageUrl || '',
    bgColor:        body.bgColor || '#050815',
    contentTitle:   body.contentTitle || '',
    contentItems:   Array.isArray(body.contentItems) ? body.contentItems.filter(Boolean) : [],
    utmSource:      body.utmSource || '',
    utmMedium:      body.utmMedium || '',
    utmCampaign:    body.utmCampaign || '',
    active:         true,
    created:        new Date().toISOString(),
    turnstileEnabled: await assertBotProtectionAllowed(await resolveUserId(requireAuth(event).email), body.turnstileEnabled),
    endsAt:         body.endsAt ? new Date(body.endsAt).toISOString() : defaultCampaignEnd(),
  }

  // Kampagnen-Termin: nur über den Kampagnen-Link buchbar, verschwindet mit der Kampagne
  if (body.appointmentEnabled !== false && campaign.formId) {
    const typeId = await createCampaignAppointmentType(campaign.userId, {
      campaignId: campaign.campaignId,
      name: body.appointmentName || campaign.headline || campaign.name,
      durationMinutes: body.appointmentDurationMinutes,
    })
    if (typeId) (campaign as any).appointmentTypeId = typeId
  }

  await client.send(new PutCommand({ TableName: 'plexora-marketing', Item: campaign }))
  // Aus dem Entwurf ist jetzt eine echte Kampagne geworden: Entwurf entfernen (best effort)
  await deleteOwnDraftQuietly(event, 'marketing-campaign')
  return { success: true, campaign }
})
