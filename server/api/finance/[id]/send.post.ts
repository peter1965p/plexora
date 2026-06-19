import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import PDFDocument from 'pdfkit'

function createSESClient() {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME
  if (isLambda) {
    return new SESClient({ region: 'eu-central-1' })
  }
  const config = useRuntimeConfig()
  const accessKey = (config.awsAccessKeyId as string || process.env.AWS_ACCESS_KEY_ID_CUSTOM || '').replace(/^"|"$/g, '')
  const secretKey = (config.awsSecretAccessKey as string || process.env.AWS_SECRET_ACCESS_KEY_CUSTOM || '').replace(/^"|"$/g, '')
  return new SESClient({
    region: 'eu-central-1',
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }
  })
}

async function generatePDF(invoice: any, branding: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const brand = branding?.brandName || 'Plexora'
    const accent = [124, 58, 237] // violet

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

    // Empfänger
    doc.fontSize(10).fillColor([120, 120, 120]).font('Helvetica').text('RECHNUNGSEMPFÄNGER', 50, 160)
    doc.fontSize(13).fillColor([20, 20, 20]).font('Helvetica-Bold').text(invoice.client || '–', 50, 178)
    if (invoice.clientEmail) doc.fontSize(10).fillColor([80,80,80]).font('Helvetica').text(invoice.clientEmail, 50, 196)

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
    doc.moveTo(50, 700).lineTo(545, 700).strokeColor([220,220,220]).lineWidth(0.5).stroke()

    const payUrl = `https://plexora.paeffgen-it.de/pay/${invoice.invoiceId}`
    doc.fontSize(9).fillColor([150,150,150]).font('Helvetica').text('Online bezahlen:', 50, 715)
    doc.fontSize(9).fillColor([124,58,237]).font('Helvetica').text(payUrl, 50, 728, { link: payUrl, underline: true })
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(payUrl)}&margin=2`
      const qrRes = await fetch(qrUrl)
      const qrBuf = Buffer.from(await qrRes.arrayBuffer())
      doc.image(qrBuf, 460, 705, { width: 80, height: 80 })
      doc.fontSize(8).fillColor([150,150,150]).font('Helvetica')
        .text('QR-Code scannen', 460, 788, { width: 80, align: 'center' })
        .text('zum Bezahlen', 460, 798, { width: 80, align: 'center' })
    } catch {}

    doc.moveTo(50, 810).lineTo(545, 810).strokeColor([220,220,220]).lineWidth(0.5).stroke()
    doc.fontSize(9).fillColor([150,150,150]).font('Helvetica')
      .text(`${brand} — Vielen Dank für Ihr Vertrauen!`, 50, 820, { align: 'center', width: 495 })

    doc.end()
  })
}

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const dynamo    = getDynamoClient()
  const config    = useRuntimeConfig()

  // Rechnung aus DynamoDB holen
  const scan = await dynamo.send(new GetCommand({
    TableName: 'plexora-finance',
    Key: { userId: body.userId, invoiceId }
  }))
  const invoice = scan.Item
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })

  // Branding laden
  let branding = { brandName: 'Plexora', brandTagline: 'Business Platform' }
  try {
    const bs = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'branding', scope: 'global' }
    }))
    if (bs.Item) branding = bs.Item as any
  } catch {}

  // PDF generieren
  const pdfBuffer = await generatePDF(invoice, branding)

  // Mail via SES senden
  const toEmail   = body.toEmail || invoice.clientEmail
  const fromEmail = (config.sesFromEmail as string) || 'billing@paeffgen-it.de'
  const subject   = `Rechnung ${invoice.number || invoiceId?.slice(0,8).toUpperCase()} von ${branding.brandName}`
  const boundary  = `----=_Part_${Date.now()}`

  const rawEmail = [
    `From: ${branding.brandName} <${fromEmail}>`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    `<html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto">`,
    `<h2 style="color:#7C3AED">${branding.brandName}</h2>`,
    `<p>Hallo,</p>`,
    `<p>im Anhang finden Sie Ihre Rechnung <strong>${invoice.number || invoiceId?.slice(0,8).toUpperCase()}</strong> über <strong>€ ${Number(invoice.amount).toLocaleString('de-DE')}</strong>.</p>`,
    `<p>Bitte begleichen Sie den Betrag bis zum <strong>${invoice.dueDate || '–'}</strong>.</p>`,
    `<p>Vielen Dank für Ihr Vertrauen!</p>`,
    `<p style="color:#999;font-size:12px">– Das ${branding.brandName} Team</p>`,
    `</body></html>`,
    ``,
    `--${boundary}`,
    `Content-Type: application/pdf; name="Rechnung-${invoice.number || invoiceId?.slice(0,8)}.pdf"`,
    `Content-Transfer-Encoding: base64`,
    `Content-Disposition: attachment; filename="Rechnung-${invoice.number || invoiceId?.slice(0,8)}.pdf"`,
    ``,
    pdfBuffer.toString('base64'),
    ``,
    `--${boundary}--`,
  ].join('\r\n')

  const ses = createSESClient()
  await ses.send(new SendRawEmailCommand({
    RawMessage: { Data: Buffer.from(rawEmail) }
  }))

  // Status auf 'sent' aktualisieren
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-finance',
    Key: { userId: invoice.userId, invoiceId },
    UpdateExpression: 'SET mailSent = :ms, mailSentAt = :at',
    ExpressionAttributeValues: { ':ms': true, ':at': new Date().toISOString() }
  }))

  return { success: true, message: `Rechnung an ${toEmail} gesendet` }
})
