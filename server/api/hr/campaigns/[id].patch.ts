import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertOwner } from '../../../utils/ownership'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body       = await readBody(event)
  const client     = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-campaigns',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Stellenausschreibung nicht gefunden' })
  await assertOwner(event, existing)

  await client.send(new UpdateCommand({
    TableName: 'plexora-campaigns',
    Key: { userId: existing.userId, campaignId },
    UpdateExpression: 'SET title = :ti, department = :de, #loc = :lo, #ty = :ty, description = :ds, requirements = :rq, #st = :stv, companyName = :cn, accentColor = :ac, logoUrl = :lu, headerImageUrl = :hi, bgImageUrl = :bi, bgColor = :bc, contentTitle = :ct, contentItems = :ci, customTemplateHtml = :cth, templatePresetKey = :tpk',
    ExpressionAttributeNames: { '#loc': 'location', '#ty': 'type', '#st': 'status' },
    ExpressionAttributeValues: {
      ':ti': body.title !== undefined ? body.title : existing.title,
      ':de': body.department !== undefined ? body.department : existing.department,
      ':lo': body.location !== undefined ? body.location : existing.location,
      ':ty': body.type !== undefined ? body.type : (existing.type || 'fulltime'),
      ':ds': body.description !== undefined ? body.description : existing.description,
      ':rq': body.requirements !== undefined ? body.requirements : existing.requirements,
      ':stv': body.status !== undefined ? body.status : (existing.status || 'active'),
      ':cn': body.companyName !== undefined ? body.companyName : (existing.companyName || ''),
      ':ac': body.accentColor !== undefined ? body.accentColor : (existing.accentColor || ''),
      ':lu': body.logoUrl !== undefined ? body.logoUrl : (existing.logoUrl || ''),
      ':hi': body.headerImageUrl !== undefined ? body.headerImageUrl : (existing.headerImageUrl || ''),
      ':bi': body.bgImageUrl !== undefined ? body.bgImageUrl : (existing.bgImageUrl || ''),
      ':bc': body.bgColor !== undefined ? body.bgColor : (existing.bgColor || ''),
      ':ct': body.contentTitle !== undefined ? body.contentTitle : (existing.contentTitle || ''),
      ':ci': Array.isArray(body.contentItems) ? body.contentItems.filter(Boolean) : (existing.contentItems || []),
      // Design-Editor speichert über dieselbe Route — Fallback auf den bestehenden Wert,
      // damit ein einfaches Basis-Update ein gespeichertes Template nicht versehentlich löscht.
      ':cth': body.customTemplateHtml !== undefined ? body.customTemplateHtml : (existing.customTemplateHtml || ''),
      ':tpk': body.templatePresetKey !== undefined ? body.templatePresetKey : (existing.templatePresetKey || ''),
    }
  }))

  return { success: true }
})
