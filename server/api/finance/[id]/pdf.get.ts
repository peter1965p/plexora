import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import PDFDocument from 'pdfkit'

async function generatePDF(invoice: any, branding: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const brand  = branding?.brandName || 'Plexora'
    const accent = [124, 58, 237]

    doc.fontSize(28).fillColor(accent).font('Helvetica-Bold').text(brand, 50, 50)
    doc.fontSize(10).fillColor([150,150,150]).font('Helvetica').text(branding?.brandTagline || 'Business Platform', 50, 85)
    doc.fontSize(22).fillColor([30,30,30]).font('Helvetica-Bold').text('RECHNUNG', 350, 50, { align: 'right', width: 200 })
    doc.fontSize(11).fillColor([80,80,80]).font('Helvetica')
      .text(`Nr: ${invoice.number || invoice.invoiceId?.slice(0,8).toUpperCase()}`, 350, 80, { align: 'right', width: 200 })
      .text(`Datum: ${new Date(invoice.created || Date.now()).toLocaleDateString('de-DE')}`, 350, 96, { align: 'right', width: 200 })
      .text(`Fälligkeit: ${invoice.dueDate || '–'}`, 350, 112, { align: 'right', width: 200 })

    doc.moveTo(50, 140).lineTo(545, 140).strokeColor(accent).lineWidth(2).stroke()
    doc.fontSize(10).fillColor([120,120,120]).font('Helvetica').text('RECHNUNGSEMPFÄNGER', 50, 160)
    doc.fontSize(13).fillColor([20,20,20]).font('Helvetica-Bold').text(invoice.client || '–', 50, 178)

    doc.rect(50, 240, 495, 28).fill([245,245,250])
    doc.fontSize(10).fillColor([80,80,80]).font('Helvetica-Bold')
      .text('BESCHREIBUNG', 60, 250).text('MENGE', 320, 250).text('EINZELPREIS', 390, 250).text('GESAMT', 470, 250)

    const items = invoice.items || [{ description: invoice.description || 'Dienstleistung', qty: 1, price: invoice.amount }]
    let y = 290
    items.forEach((item: any) => {
      const total = (item.qty || 1) * (item.price || invoice.amount || 0)
      doc.fontSize(11).fillColor([30,30,30]).font('Helvetica')
        .text(item.description || 'Dienstleistung', 60, y, { width: 250 })
        .text(String(item.qty || 1), 320, y)
        .text(`€ ${Number(item.price || invoice.amount).toLocaleString('de-DE')}`, 390, y)
        .text(`€ ${total.toLocaleString('de-DE')}`, 470, y)
      doc.moveTo(50, y+22).lineTo(545, y+22).strokeColor([230,230,230]).lineWidth(0.5).stroke()
      y += 30
    })

    const netto  = Number(invoice.amount) || 0
    const mwst   = Math.round(netto * 0.19 * 100) / 100
    const brutto = netto + mwst

    doc.moveTo(350, y+10).lineTo(545, y+10).strokeColor(accent).lineWidth(1).stroke()
    doc.fontSize(10).fillColor([80,80,80]).font('Helvetica')
      .text('Nettobetrag:', 350, y+20).text(`€ ${netto.toLocaleString('de-DE')}`, 470, y+20)
      .text('MwSt. 19%:', 350, y+36).text(`€ ${mwst.toLocaleString('de-DE')}`, 470, y+36)
    doc.rect(350, y+54, 195, 28).fill(accent)
    doc.fontSize(12).fillColor([255,255,255]).font('Helvetica-Bold')
      .text('GESAMT:', 360, y+62).text(`€ ${brutto.toLocaleString('de-DE')}`, 470, y+62)

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
  const userId    = getQuery(event).userId as string || 'demo-user'
  const dynamo    = getDynamoClient()

  const scan = await dynamo.send(new GetCommand({
    TableName: 'plexora-finance',
    Key: { userId, invoiceId }
  }))
  const invoice = scan.Item
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })

  let branding = { brandName: 'Plexora', brandTagline: 'Business Platform' }
  try {
    const bs = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'branding', scope: 'global' }
    }))
    if (bs.Item) branding = bs.Item as any
  } catch {}

  const pdfBuffer = await generatePDF(invoice, branding)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="Rechnung-${invoice.number || invoiceId?.slice(0,8)}.pdf"`)
  return pdfBuffer
})
