import { Resend } from 'resend'
import { GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertOwner } from '../../../utils/ownership'
import PDFDocument from 'pdfkit'

async function generatePDF(invoice: any, branding: any, company: any = {}, invoiceSettings: any = {}): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4', autoFirstPage: true, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const brand = branding?.brandName || 'Plexora'
    const accent = [234, 88, 12] // violet

    // Header
    doc.fontSize(28).fillColor(accent).font('Helvetica-Bold').text(brand, 50, 50)
    doc.fontSize(10).fillColor([150, 150, 150]).font('Helvetica').text(branding?.brandTagline || 'Business Platform', 50, 85)

    // Rechnung Titel
    doc.fontSize(22).fillColor([30, 30, 30]).font('Helvetica-Bold').text('RECHNUNG', 350, 50, { align: 'right', width: 200 })
    doc.fontSize(11).fillColor([80, 80, 80]).font('Helvetica')
      .text(`Nr: ${invoice.number || invoice.invoiceId?.slice(0,8).toUpperCase()}`, 350, 80, { align: 'right', width: 200 })
      .text(`Datum: ${new Date(invoice.created || Date.now()).toLocaleDateString('de-DE')}`, 350, 96, { align: 'right', width: 200 })
      .text(`Fälligkeit: ${invoice.dueDate || '–'}`, 350, 112, { align: 'right', width: 200 })

    // Trennlinie
    doc.moveTo(50, 140).lineTo(545, 140).strokeColor(accent).lineWidth(2).stroke()

    // Absender (Briefkopf-Stil klein)
    const senderLine = [company.legalName || brand, company.street, company.zipCity, company.phone, company.email].filter(Boolean).join(' · ')
    doc.fontSize(8).fillColor([150, 150, 150]).font('Helvetica').text(senderLine, 50, 152, { width: 300 })

    // Empfänger
    doc.fontSize(10).fillColor([120, 120, 120]).font('Helvetica').text('RECHNUNGSEMPFÄNGER', 50, 170)
    doc.fontSize(13).fillColor([20, 20, 20]).font('Helvetica-Bold').text(invoice.client || '–', 50, 186)
    let ry = 204
    if (invoice.clientAddress) { doc.fontSize(10).fillColor([80,80,80]).font('Helvetica').text(invoice.clientAddress, 50, ry); ry += 16 }
    if (invoice.clientEmail) doc.fontSize(10).fillColor([80,80,80]).font('Helvetica').text(invoice.clientEmail, 50, ry)

    // Positions-Tabelle Header
    doc.rect(50, 240, 495, 28).fill([245, 245, 250])
    doc.fontSize(10).fillColor([80,80,80]).font('Helvetica-Bold')
      .text('BESCHREIBUNG', 60, 250)
      .text('MENGE', 320, 250)
      .text('EINZELPREIS', 390, 250)
      .text('GESAMT', 470, 250)

    // Positionen
    const items = invoice.items || [{ description: invoice.description || 'Dienstleistung', qty: 1, price: invoice.amount }]
    let y = 290
    items.forEach((item: any) => {
      const total = (item.qty || 1) * (item.price || invoice.amount || 0)
      doc.fontSize(11).fillColor([30,30,30]).font('Helvetica')
        .text(item.description || 'Dienstleistung', 60, y, { width: 250 })
        .text(String(item.qty || 1), 320, y)
        .text(`€ ${Number(item.price || invoice.amount).toLocaleString('de-DE')}`, 390, y)
        .text(`€ ${total.toLocaleString('de-DE')}`, 470, y)
      doc.moveTo(50, y + 22).lineTo(545, y + 22).strokeColor([230,230,230]).lineWidth(0.5).stroke()
      y += 30
    })

    // Summe
    const netto = Number(invoice.amount) || 0
    const mwst  = Math.round(netto * 0.19 * 100) / 100
    const brutto = netto + mwst

    doc.moveTo(350, y + 10).lineTo(545, y + 10).strokeColor(accent).lineWidth(1).stroke()
    doc.fontSize(10).fillColor([80,80,80]).font('Helvetica')
      .text('Nettobetrag:', 350, y + 20).text(`€ ${netto.toLocaleString('de-DE')}`, 470, y + 20)
      .text('MwSt. 19%:', 350, y + 36).text(`€ ${mwst.toLocaleString('de-DE')}`, 470, y + 36)
    doc.rect(350, y + 54, 195, 28).fill(accent)
    doc.fontSize(12).fillColor([255,255,255]).font('Helvetica-Bold')
      .text('GESAMT:', 360, y + 62).text(`€ ${brutto.toLocaleString('de-DE')}`, 470, y + 62)

    // Footer
    doc.moveTo(50, y+80).lineTo(545, y+80).strokeColor([220,220,220]).lineWidth(0.5).stroke()

    const payUrl = `https://app.plexora.eu/pay/${invoice.invoiceId}`
    doc.fontSize(9).fillColor([150,150,150]).font('Helvetica').text('Online bezahlen:', 50, y+92)
    doc.fontSize(9).fillColor([124,58,237]).font('Helvetica').text(payUrl, 50, y+105, { link: payUrl, underline: true })
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(payUrl)}&margin=2`
      const qrRes = await fetch(qrUrl)
      const qrBuf = Buffer.from(await qrRes.arrayBuffer())
      doc.image(qrBuf, 460, y+82, { width: 72, height: 72 })
      doc.fontSize(8).fillColor([150,150,150]).font('Helvetica')
        .text('QR-Code scannen', 460, y+156, { width: 72, align: 'center' })
        .text('zum Bezahlen', 460, y+166, { width: 72, align: 'center' })
    } catch {}

    doc.moveTo(50, y+178).lineTo(545, y+178).strokeColor([220,220,220]).lineWidth(0.5).stroke()
    doc.fontSize(9).fillColor([150,150,150]).font('Helvetica')
      .text(`${brand} — Vielen Dank für Ihr Vertrauen!`, 50, y+184, { align: 'center', width: 495 })

    doc.end()
  })
}

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
  let branding = { brandName: 'Plexora', brandTagline: 'Business Platform' }
  try {
    const bs = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'branding', scope: 'global' }
    }))
    if (bs.Item) branding = bs.Item as any
  } catch {}

  // Company laden
  let company = { legalName: '', street: '', zipCity: '', email: '' }
  try {
    const cs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'company', scope: 'global' } }))
    if (cs.Item) company = cs.Item as any
  } catch {}

  // PDF generieren
  let invoiceSettings = { vatRate: 19, smallBusiness: false, priceDisplay: 'netto' }
  try {
    const is = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'invoice', scope: 'global' } }))
    if (is.Item) invoiceSettings = { ...invoiceSettings, ...is.Item }
  } catch {}

  const pdfBuffer = await generatePDF(invoice, branding, company, invoiceSettings)

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
