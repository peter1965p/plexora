import { ScanCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { getDynamoClient } from '../../../utils/dynamodb'
import PDFDocument from 'pdfkit'

function createSESClient() {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME
  if (isLambda) return new SESClient({ region: 'eu-central-1' })
  const config = useRuntimeConfig()
  const accessKey = (config.awsAccessKeyId as string || process.env.AWS_ACCESS_KEY_ID_CUSTOM || '').replace(/^"|"$/g, '')
  const secretKey = (config.awsSecretAccessKey as string || process.env.AWS_SECRET_ACCESS_KEY_CUSTOM || '').replace(/^"|"$/g, '')
  return new SESClient({ region: 'eu-central-1', credentials: { accessKeyId: accessKey, secretAccessKey: secretKey } })
}

const DUNNING_LEVELS: Record<number, { status: string, label: string, fee: number, text: string }> = {
  1: { status: 'dunning_1', label: '1. Mahnung',                    fee: 0,  text: 'Wir möchten Sie freundlich daran erinnern, dass die folgende Rechnung noch offen ist.' },
  2: { status: 'dunning_2', label: '2. Mahnung',                    fee: 15, text: 'Trotz unserer ersten Mahnung haben wir noch keinen Zahlungseingang verbuchen können.' },
  3: { status: 'dunning_3', label: '3. Mahnung — Letzte Mahnung',   fee: 40, text: 'Dies ist unsere letzte Mahnung. Bei Nichtbegleichung übergeben wir die Forderung an ein Inkassounternehmen.' },
}

async function generateDunningPDF(invoice: any, dunning: any, branding: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const brand  = branding?.brandName || 'Plexora'
    const accent = [124, 58, 237]
    const red    = [224, 92, 92]

    doc.fontSize(28).fillColor(accent).font('Helvetica-Bold').text(brand, 50, 50)
    doc.fontSize(20).fillColor(red).font('Helvetica-Bold').text(dunning.label.toUpperCase(), 350, 50, { align: 'right', width: 200 })
    doc.fontSize(11).fillColor([80,80,80]).font('Helvetica')
      .text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 350, 80, { align: 'right', width: 200 })
      .text(`Rechnungsnr.: ${invoice.number || invoice.invoiceId?.slice(0,8).toUpperCase()}`, 350, 96, { align: 'right', width: 200 })

    doc.moveTo(50, 130).lineTo(545, 130).strokeColor(red).lineWidth(2).stroke()

    doc.fontSize(10).fillColor([120,120,120]).font('Helvetica').text('AN', 50, 150)
    doc.fontSize(13).fillColor([20,20,20]).font('Helvetica-Bold').text(invoice.client || '–', 50, 168)
    if (invoice.clientEmail) doc.fontSize(10).fillColor([80,80,80]).font('Helvetica').text(invoice.clientEmail, 50, 186)

    doc.fontSize(12).fillColor([30,30,30]).font('Helvetica').text(dunning.text, 50, 230, { width: 495, lineGap: 4 })

    const netto  = Number(invoice.amount) || 0
    const mwst   = Math.round(netto * 0.19 * 100) / 100
    const brutto = netto + mwst
    const total  = brutto + dunning.fee

    doc.rect(50, 310, 495, 28).fill([255,245,245])
    doc.fontSize(10).fillColor([80,80,80]).font('Helvetica-Bold')
      .text('RECHNUNG', 60, 320).text('BETRAG', 280, 320).text('FÄLLIG SEIT', 380, 320).text('MAHNGEBÜHR', 460, 320)

    doc.fontSize(11).fillColor([30,30,30]).font('Helvetica')
      .text(invoice.number || '–', 60, 352)
      .text(`€ ${brutto.toLocaleString('de-DE')}`, 280, 352)
      .text(invoice.dueDate || '–', 380, 352)
      .text(dunning.fee > 0 ? `€ ${dunning.fee}` : '–', 460, 352)

    doc.rect(350, 390, 195, 28).fill(red)
    doc.fontSize(12).fillColor([255,255,255]).font('Helvetica-Bold')
      .text('GESAMT:', 360, 398).text(`€ ${total.toLocaleString('de-DE')}`, 460, 398)

    doc.moveTo(50, 750).lineTo(545, 750).strokeColor([220,220,220]).lineWidth(0.5).stroke()
    doc.fontSize(9).fillColor([150,150,150]).font('Helvetica')
      .text(`${brand} — Bitte begleichen Sie den Betrag umgehend.`, 50, 760, { align: 'center', width: 495 })

    doc.end()
  })
}

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const dynamo    = getDynamoClient()

  // Dunning Settings laden
  let dunningConfig = DUNNING_LEVELS
  try {
    const ds = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'dunning', scope: 'global' } }))
    if (ds.Item) {
      const s = ds.Item
      if (s.level1) dunningConfig[1] = { ...dunningConfig[1], fee: s.level1.fee, text: s.level1.text }
      if (s.level2) dunningConfig[2] = { ...dunningConfig[2], fee: s.level2.fee, text: s.level2.text }
      if (s.level3) dunningConfig[3] = { ...dunningConfig[3], fee: s.level3.fee, text: s.level3.text }
    }
  } catch {}

  // Rechnung holen
  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'invoiceId = :id',
    ExpressionAttributeValues: { ':id': invoiceId }
  }))
  const invoice = scan.Items?.[0]
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })

  const level   = body.level || 1
  const dunning = dunningConfig[level]

  // Branding laden
  let branding = { brandName: 'Plexora', brandTagline: 'Business Platform' }
  try {
    const bs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: 'global' } }))
    if (bs.Item) branding = bs.Item as any
  } catch {}

  // PDF generieren
  const pdfBuffer = await generateDunningPDF(invoice, dunning, branding)

  // Mail senden
  const toEmail   = invoice.clientEmail
  const fromEmail = 'billing@plexora.eu'
  const subject   = `${dunning.label}: Rechnung ${invoice.number} — ${branding.brandName}`
  const boundary  = `----=_Part_${Date.now()}`
  const netto     = Number(invoice.amount) || 0
  const brutto    = netto + Math.round(netto * 0.19 * 100) / 100
  const total     = brutto + dunning.fee

  if (toEmail) {
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
      `<h2 style="color:#E05C5C">${dunning.label}</h2>`,
      `<p>Sehr geehrte/r ${invoice.client},</p>`,
      `<p>${dunning.text}</p>`,
      `<table style="border-collapse:collapse;width:100%;margin:20px 0">`,
      `<tr style="background:#fff5f5"><td style="padding:8px;border:1px solid #eee">Rechnungsnummer</td><td style="padding:8px;border:1px solid #eee"><strong>${invoice.number}</strong></td></tr>`,
      `<tr><td style="padding:8px;border:1px solid #eee">Fällig seit</td><td style="padding:8px;border:1px solid #eee"><strong>${invoice.dueDate}</strong></td></tr>`,
      `<tr><td style="padding:8px;border:1px solid #eee">Offener Betrag</td><td style="padding:8px;border:1px solid #eee"><strong>€ ${brutto.toLocaleString('de-DE')}</strong></td></tr>`,
      dunning.fee > 0 ? `<tr><td style="padding:8px;border:1px solid #eee">Mahngebühr</td><td style="padding:8px;border:1px solid #eee"><strong>€ ${dunning.fee}</strong></td></tr>` : '',
      `<tr style="background:#E05C5C;color:white"><td style="padding:8px"><strong>Gesamtbetrag</strong></td><td style="padding:8px"><strong>€ ${total.toLocaleString('de-DE')}</strong></td></tr>`,
      `</table>`,
      `<p style="color:#999;font-size:12px">– Das ${branding.brandName} Team</p>`,
      `</body></html>`,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${dunning.label}-${invoice.number}.pdf"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${dunning.label}-${invoice.number}.pdf"`,
      ``,
      pdfBuffer.toString('base64'),
      ``,
      `--${boundary}--`,
    ].join('\r\n')

    const ses = createSESClient()
    await ses.send(new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(rawEmail) } }))
  }

  // Status updaten
  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-finance',
    Key: { userId: invoice.userId, invoiceId },
    UpdateExpression: 'SET #st = :st, dunningLevel = :dl, dunningDate = :dd',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':st': dunning.status, ':dl': level, ':dd': new Date().toISOString() }
  }))

  return { success: true, status: dunning.status, message: `${dunning.label} an ${toEmail} gesendet` }
})
