import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertOwner } from '../../utils/ownership'
import { assertBotProtectionAllowed } from '../../utils/botGuard'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body       = await readBody(event)
  const client     = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-marketing',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })
  await assertOwner(event, existing)

  // Bot-Schutz: ohne Angabe bleibt der gespeicherte Wert (andere Editoren speichern über dieselbe Route)
  const turnstileEnabled = body.turnstileEnabled === undefined
    ? existing.turnstileEnabled === true
    : await assertBotProtectionAllowed(existing.userId, body.turnstileEnabled)

  await client.send(new UpdateCommand({
    TableName: 'plexora-marketing',
    Key: { userId: existing.userId, campaignId },
    UpdateExpression: 'SET #nm = :nm, slug = :sl, formId = :fi, headline = :hl, subtext = :st, headerImageUrl = :hi, accentColor = :ac, bgImageUrl = :bi, bgColor = :bc, contentTitle = :ct, contentItems = :ci, utmSource = :us, utmMedium = :um, utmCampaign = :uc, active = :av, customTemplateHtml = :cth, templatePresetKey = :tpk, turnstileEnabled = :tse',
    ExpressionAttributeNames: { '#nm': 'name' },
    ExpressionAttributeValues: {
      ':nm': body.name || '',
      ':sl': body.slug || '',
      ':fi': body.formId || '',
      ':hl': body.headline || '',
      ':st': body.subtext || '',
      ':hi': body.headerImageUrl || '',
      ':ac': body.accentColor || '#6C3FE8',
      ':bi': body.bgImageUrl || '',
      ':bc': body.bgColor || '#050815',
      ':ct': body.contentTitle || '',
      ':ci': Array.isArray(body.contentItems) ? body.contentItems.filter(Boolean) : [],
      ':us': body.utmSource || '',
      ':um': body.utmMedium || '',
      ':uc': body.utmCampaign || '',
      ':av': body.active !== false,
      // Design-Editor speichert über dieselbe Route — Fallback auf den bestehenden Wert,
      // damit das einfache Basis-Modal ein gespeichertes Template nicht versehentlich löscht.
      ':cth': body.customTemplateHtml !== undefined ? body.customTemplateHtml : (existing.customTemplateHtml || ''),
      ':tse': turnstileEnabled,
      ':tpk': body.templatePresetKey !== undefined ? body.templatePresetKey : (existing.templatePresetKey || ''),
    }
  }))

  return { success: true }
})
