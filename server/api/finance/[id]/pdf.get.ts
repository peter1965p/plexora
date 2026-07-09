import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { resolveUserId } from '../../../utils/tenant'
import { renderInvoiceTemplateToPdf } from '../../../utils/invoiceTemplate'
import { getPresetHtml } from '../../../utils/invoicePresets'

export default defineEventHandler(async (event) => {
  const invoiceId   = getRouterParam(event, 'id')
  const callerEmail = event.context.auth?.email || 'demo-user'
  const dynamo       = getDynamoClient()

  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'invoiceId = :id',
    ExpressionAttributeValues: { ':id': invoiceId },
  }))
  const invoice = scan.Items?.[0]
  // Zugriff nur für den ausstellenden Tenant selbst oder den in der Rechnung genannten Kunden
  if (invoice && invoice.userId !== callerEmail && invoice.clientEmail !== callerEmail) {
    throw createError({ statusCode: 403, message: 'Kein Zugriff auf diese Rechnung' })
  }
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })

  const tenantUserId = await resolveUserId(invoice.userId)

  let branding = { brandName: 'Plexora', brandTagline: 'Business Platform', primaryColor: '#EA580C' }
  try {
    const bs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: tenantUserId } }))
    if (bs.Item) branding = { ...branding, ...bs.Item }
  } catch {}

  let company: any = {}
  try {
    const cs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'company', scope: tenantUserId } }))
    if (cs.Item) company = cs.Item
  } catch {}

  let invoiceSettings = { vatRate: 19, smallBusiness: false, priceDisplay: 'netto' }
  try {
    const is = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'invoice', scope: tenantUserId } }))
    if (is.Item) invoiceSettings = { ...invoiceSettings, ...is.Item }
  } catch {}

  let paymentPrefs = { sepaEnabled: true, stripeEnabled: true }
  try {
    const pp = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'invoice-payment', scope: tenantUserId } }))
    if (pp.Item) paymentPrefs = { ...paymentPrefs, ...pp.Item }
  } catch {}

  // Aktives Rechnungs-Template des ausstellenden Tenants laden (Fallback: Standard-Preset)
  let templateHtml = getPresetHtml('standard')
  try {
    const tpl = await dynamo.send(new GetCommand({ TableName: 'plexora-invoice-templates', Key: { userId: tenantUserId } }))
    if (tpl.Item?.html) templateHtml = tpl.Item.html
  } catch {}

  const pdfBuffer = await renderInvoiceTemplateToPdf(templateHtml, invoice, branding, company, invoiceSettings, paymentPrefs)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="Rechnung-${invoice.number || invoiceId?.slice(0,8)}.pdf"`)
  return pdfBuffer
})
