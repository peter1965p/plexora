import { Resend } from 'resend'
import { GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertOwner } from '../../../utils/ownership'
import { requireMailSender, validRecipient } from '../../../utils/mailGuard'
import { resolveUserId } from '../../../utils/tenant'
import { assertMailQuota } from '../../../utils/mailQuota'
import { renderInvoiceTemplateToPdf } from '../../../utils/invoiceTemplate'
import { getPresetHtml } from '../../../utils/invoicePresets'
import { embedZugferd } from '../../../utils/zugferd'
import { assertValidFor } from '../../../utils/einvoiceContext'
import { fromRecord, toCii, type EProfile } from '../../../../shared/einvoice'

export default defineEventHandler(async (event) => {
  requireMailSender(event) // Anmeldung Pflicht, Demo-Konto gesperrt
  const invoiceId = getRouterParam(event, 'id')
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

  // Empfänger ausschließlich aus der Rechnung, nie aus dem Request (verhindert Versand an beliebige Dritte)
  const toEmail = validRecipient(invoice.clientEmail)
  if (!toEmail) throw createError({ statusCode: 422, message: 'Die Rechnung hat keine gültige Empfänger-Adresse (Kunden-E-Mail).' })

  const tenantUserId = await resolveUserId(invoice.userId)

  // Branding laden
  let branding = { brandName: 'Plexora', brandTagline: 'Business Platform', primaryColor: '#EA580C' }
  try {
    const bs = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'branding', scope: tenantUserId }
    }))
    if (bs.Item) branding = { ...branding, ...bs.Item }
  } catch {}

  // Company laden
  let company = { legalName: '', street: '', zipCity: '', email: '' }
  try {
    const cs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'company', scope: tenantUserId } }))
    if (cs.Item) company = cs.Item as any
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

  // Format laut Einstellung: normale PDF (Standard), ZUGFeRD (PDF mit eingebetteter E-Rechnung) oder XRechnung (XML zusätzlich). Fehlen Pflichtangaben: nicht senden, fehlende nennen.
  const format = (['zugferd', 'xrechnung'] as string[]).includes((invoiceSettings as any).einvoiceFormat) ? (invoiceSettings as any).einvoiceFormat as EProfile : 'pdf'
  const model = fromRecord(invoice, company, invoiceSettings)
  if (format !== 'pdf') assertValidFor(model, format)
  let pdfBuffer: Buffer = await renderInvoiceTemplateToPdf(templateHtml, invoice, branding, company, invoiceSettings, paymentPrefs)
  const extraAttachments: Array<{ filename: string; content: Buffer }> = []
  if (format === 'zugferd') pdfBuffer = Buffer.from(await embedZugferd(pdfBuffer, toCii(model, 'zugferd'), `Rechnung ${model.number}`))
  if (format === 'xrechnung') extraAttachments.push({ filename: `${String(model.number).replace(/[^\w.-]/g, '_')}_XRechnung.xml`, content: Buffer.from(toCii(model, 'xrechnung'), 'utf8') })

  // Mail via Resend senden
  const subject  = `Rechnung ${invoice.number || invoiceId?.slice(0,8).toUpperCase()} von ${branding.brandName}`
  const resend   = new Resend(config.resendApiKey as string)
  await assertMailQuota({ tenantId: tenantUserId, pool: 'system', recipients: [toEmail], what: 'invoice' })   // Tageslimit des Mandanten (Tarif)

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
    }, ...extraAttachments],
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
