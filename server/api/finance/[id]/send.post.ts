import { Resend } from 'resend'
import { GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertOwner } from '../../../utils/ownership'
import { resolveUserId } from '../../../utils/tenant'
import { renderInvoiceTemplateToPdf } from '../../../utils/invoiceTemplate'
import { getPresetHtml } from '../../../utils/invoicePresets'

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const dynamo    = getDynamoClient()
  const config    = useRuntimeConfig()

  // Rechnung aus DynamoDB holen
  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'invoiceId = :id',
    ExpressionAttributeValues: { ':id': invoiceId },
  }))
  const invoice = scan.Items?.[0]
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })
  await assertOwner(event, invoice)

  // Branding laden
  let branding = { brandName: 'Plexora', brandTagline: 'Business Platform', primaryColor: '#EA580C' }
  try {
    const bs = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'branding', scope: 'global' }
    }))
    if (bs.Item) branding = { ...branding, ...bs.Item }
  } catch {}

  // Company laden
  let company = { legalName: '', street: '', zipCity: '', email: '' }
  try {
    const cs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'company', scope: 'global' } }))
    if (cs.Item) company = cs.Item as any
  } catch {}

  let invoiceSettings = { vatRate: 19, smallBusiness: false, priceDisplay: 'netto' }
  try {
    const is = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'invoice', scope: 'global' } }))
    if (is.Item) invoiceSettings = { ...invoiceSettings, ...is.Item }
  } catch {}

  // Aktives Rechnungs-Template des ausstellenden Tenants laden (Fallback: Standard-Preset)
  let templateHtml = getPresetHtml('standard')
  try {
    const tenantUserId = await resolveUserId(invoice.userId)
    const tpl = await dynamo.send(new GetCommand({ TableName: 'plexora-invoice-templates', Key: { userId: tenantUserId } }))
    if (tpl.Item?.html) templateHtml = tpl.Item.html
  } catch {}

  const pdfBuffer = await renderInvoiceTemplateToPdf(templateHtml, invoice, branding, company, invoiceSettings)

  // Mail via Resend senden
  const toEmail  = body.toEmail || invoice.clientEmail
  const subject  = `Rechnung ${invoice.number || invoiceId?.slice(0,8).toUpperCase()} von ${branding.brandName}`
  const resend   = new Resend(config.resendApiKey as string)

  await resend.emails.send({
    from: `${branding.brandName} <billing@plexora.eu>`,
    to:   toEmail,
    subject,
    html: `
      <html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto">
        <h2 style="color:#ea580c">${branding.brandName}</h2>
        <p>Hallo,</p>
        <p>im Anhang finden Sie Ihre Rechnung <strong>${invoice.number || invoiceId?.slice(0,8).toUpperCase()}</strong> über <strong>€ ${Number(invoice.amount).toLocaleString('de-DE')}</strong>.</p>
        <p>Bitte begleichen Sie den Betrag bis zum <strong>${invoice.dueDate || '–'}</strong>.</p>
        <p>Vielen Dank für Ihr Vertrauen!</p>
        <p style="color:#999;font-size:12px">– Das ${branding.brandName} Team</p>
      </body></html>`,
    attachments: [{
      filename: `Rechnung-${invoice.number || invoiceId?.slice(0,8)}.pdf`,
      content:  pdfBuffer,
    }],
  })

  // Status auf 'sent' aktualisieren
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-finance',
    Key: { userId: invoice.userId, invoiceId },
    UpdateExpression: 'SET mailSent = :ms, mailSentAt = :at',
    ExpressionAttributeValues: { ':ms': true, ':at': new Date().toISOString() }
  }))

  return { success: true, message: `Rechnung an ${toEmail} gesendet` }
})
