import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { requireTenantId } from '../../../utils/auth'
import { resolveUserId } from '../../../utils/tenant'
import { renderVehiclePriceTagPdf } from '../../../utils/vehiclePriceTagTemplate'

// Automotive (plexora-vehicles/plexora-pricetag-templates) und plexora-settings
// (branding/company) nutzen zwei unterschiedliche Tenant-ID-Quellen (requireTenantId
// vs. resolveUserId) — siehe Plan-Notiz "Identity-Bridge". Beide werden hier separat
// aus derselben Auth berechnet, sonst bekäme man still leeres Branding statt eines Fehlers.
export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const tenantId  = await requireTenantId(event)
  const vehicleId = getRouterParam(event, 'id') || ''
  const query     = getQuery(event)
  const dynamo    = getDynamoClient()

  const vehicleRes = await dynamo.send(new GetCommand({
    TableName: 'plexora-vehicles',
    Key: { tenantId, vehicleId },
  }))
  const vehicle = vehicleRes.Item
  if (!vehicle) throw createError({ statusCode: 404, message: 'Fahrzeug nicht gefunden' })

  let template: any = null
  if (query.templateId) {
    const tRes = await dynamo.send(new GetCommand({
      TableName: 'plexora-pricetag-templates',
      Key: { tenantId, templateId: String(query.templateId) },
    }))
    template = tRes.Item
  } else {
    const listRes = await dynamo.send(new QueryCommand({
      TableName: 'plexora-pricetag-templates',
      KeyConditionExpression: 'tenantId = :t',
      ExpressionAttributeValues: { ':t': tenantId },
    }))
    const templates = (listRes.Items || []).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    template = templates[0]
  }
  if (!template) throw createError({ statusCode: 404, message: 'Keine Preisschild-Vorlage vorhanden' })

  const tenantUserId = await resolveUserId(email)

  let branding = { brandName: 'Plexora', logoUrl: '', primaryColor: '#EA580C' }
  try {
    const bs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantUserId } }))
    if (bs.Item) branding = { ...branding, ...bs.Item }
  } catch {}

  let company: any = {}
  try {
    const cs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'company', scope: tenantUserId } }))
    if (cs.Item) company = cs.Item
  } catch {}

  const pdfBuffer = await renderVehiclePriceTagPdf(template as any, vehicle, branding, company)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `inline; filename="Preisschild-${vehicleId.slice(0, 8)}.pdf"`)
  return pdfBuffer
})
