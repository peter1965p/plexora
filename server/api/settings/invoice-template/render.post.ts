import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { renderInvoiceTemplateToPdf, getSampleInvoice } from '../../../utils/invoiceTemplate'
import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  // Puppeteer-Rendering ist teuer (CPU/Memory) — nur für angemeldete Nutzer, sonst Missbrauchs-/Kostenrisiko.
  const { email } = requireAuth(event)
  const body = await readBody(event)
  const html = String(body.html || '')
  if (!html.trim()) throw createError({ statusCode: 400, message: 'html erforderlich' })

  const dynamo = getDynamoClient()
  const tenantUserId = await resolveUserId(email)

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

  const pdfBuffer = await renderInvoiceTemplateToPdf(html, getSampleInvoice(), branding, company, invoiceSettings, paymentPrefs)

  setHeader(event, 'Content-Type', 'application/pdf')
  return pdfBuffer
})
