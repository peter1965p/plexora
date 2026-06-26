import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import PDFDocument from 'pdfkit'

async function generatePDF(invoice: any, branding: any, company: any = {}, invoiceSettings: any = {}): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true, bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end',  () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // ── Helpers ────────────────────────────────────────────────────────────────
    const W     = 595.28
    const ML    = 70   // left margin (25mm)
    const MR    = 525  // right margin
    const brand = branding?.brandName || company.legalName || 'Plexora'

    // Accent color from branding or orange fallback
    const accentHex = branding?.accentColor || '#EA580C'
    const hex2rgb = (h: string): [number,number,number] => {
      const c = h.replace('#','')
      return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)]
    }
    const accent = hex2rgb(accentHex)
    const GRAY   = '#888888'
    const DARK   = '#1a1a1a'
    const MID    = '#555555'

    // ── LOGO / BRAND ───────────────────────────────────────────────────────────
    doc.fontSize(26).fillColor(accentHex).font('Helvetica-Bold').text(brand, ML, 52)
    if (branding?.brandTagline) {
      doc.fontSize(9).fillColor(GRAY).font('Helvetica').text(branding.brandTagline, ML, 82)
    }

    // RECHNUNG right
    doc.fontSize(20).fillColor(DARK).font('Helvetica-Bold').text('RECHNUNG', 0, 52, { align: 'right', width: MR })
    const invNum = invoice.number || `INV-${invoice.invoiceId?.slice(0,8).toUpperCase()}`
    doc.fontSize(9).fillColor(MID).font('Helvetica').text(`Nr: ${invNum}`, 0, 78, { align: 'right', width: MR })

    // ── ACCENT LINE ────────────────────────────────────────────────────────────
    doc.rect(ML, 105, MR - ML, 2).fill(accent)

    // ── ABSENDER-ZEILE (Fensterbrief-Stil) ────────────────────────────────────
    const senderParts = [company.legalName || brand, company.street, company.zipCity, company.phone, company.email].filter(Boolean)
    doc.fontSize(7.5).fillColor(GRAY).font('Helvetica').text(senderParts.join(' · '), ML, 118, { width: 280 })

    // ── EMPFÄNGER BLOCK ───────────────────────────────────────────────────────
    let ry = 136
    doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold').text(invoice.client || '–', ML, ry)
    ry += 17
    if (invoice.clientAddress) {
      invoice.clientAddress.split('\n').forEach((line: string) => {
        doc.fontSize(10).fillColor(MID).font('Helvetica').text(line.trim(), ML, ry)
        ry += 14
      })
    }
    if (invoice.clientEmail) {
      doc.fontSize(10).fillColor(MID).font('Helvetica').text(invoice.clientEmail, ML, ry)
      ry += 14
    }

    // ── INFO BOX (rechts) ─────────────────────────────────────────────────────
    const infoX  = 360
    const infoW  = MR - infoX
    const boxY   = 118
    doc.rect(infoX, boxY, infoW, 14).fill('#f0f0f5')
    doc.fontSize(7).fillColor(GRAY).font('Helvetica-Bold')
      .text('RECHNUNGSNUMMER', infoX + 4, boxY + 3, { width: infoW/2 - 4 })
      .text('DATUM', infoX + infoW/2, boxY + 3, { width: infoW/2 - 4, align: 'center' })

    const invDate = new Date(invoice.created || Date.now()).toLocaleDateString('de-DE')
    doc.fontSize(8.5).fillColor(DARK).font('Helvetica-Bold')
      .text(invNum, infoX + 4, boxY + 17, { width: infoW/2 - 4 })
      .text(invDate, infoX + infoW/2, boxY + 17, { width: infoW/2 - 4, align: 'center' })

    // second row
    const row2Y = boxY + 35
    doc.rect(infoX, row2Y, infoW, 14).fill('#f0f0f5')
    doc.fontSize(7).fillColor(GRAY).font('Helvetica-Bold')
      .text('FÄLLIGKEIT', infoX + 4, row2Y + 3, { width: infoW/2 - 4 })
      .text('KUNDEN-NR', infoX + infoW/2, row2Y + 3, { width: infoW/2 - 4, align: 'center' })
    const dueDate = invoice.dueDate || '–'
    const clientNum = invoice.clientId?.slice(0, 8).toUpperCase() || '–'
    doc.fontSize(8.5).fillColor(DARK).font('Helvetica-Bold')
      .text(dueDate, infoX + 4, row2Y + 17, { width: infoW/2 - 4 })
      .text(clientNum, infoX + infoW/2, row2Y + 17, { width: infoW/2 - 4, align: 'center' })

    // ── BETREFF ───────────────────────────────────────────────────────────────
    const subjY = Math.max(ry + 12, 230)
    doc.fontSize(11).fillColor(DARK).font('Helvetica-Bold')
      .text(`Rechnung ${invNum}`, ML, subjY)

    // ── ITEMS TABLE ───────────────────────────────────────────────────────────
    const tY = subjY + 22
    // Header
    doc.rect(ML, tY, MR - ML, 18).fill('#f0f0f5')
    doc.fontSize(8).fillColor(MID).font('Helvetica-Bold')
      .text('POS', ML + 4,  tY + 5)
      .text('BESCHREIBUNG',  ML + 28, tY + 5, { width: 240 })
      .text('MENGE',  ML + 278, tY + 5, { width: 50, align: 'right' })
      .text('EINZELPREIS', ML + 330, tY + 5, { width: 80, align: 'right' })
      .text('GESAMT',  ML + 415, tY + 5, { width: 40, align: 'right' })

    const items = invoice.items || [{ description: invoice.description || 'Dienstleistung', qty: 1, price: invoice.amount }]
    let ty = tY + 22
    items.forEach((item: any, idx: number) => {
      const qty   = item.qty   || 1
      const price = item.price || invoice.amount || 0
      const total = qty * price
      if (idx % 2 === 1) doc.rect(ML, ty - 3, MR - ML, 20).fill('#fafafa')
      doc.fontSize(9).fillColor(DARK).font('Helvetica')
        .text(String(idx + 1), ML + 4, ty, { width: 20 })
        .text(item.description || 'Dienstleistung', ML + 28, ty, { width: 240 })
        .text(String(qty), ML + 278, ty, { width: 50, align: 'right' })
        .text(`€ ${price.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, ML + 330, ty, { width: 80, align: 'right' })
        .text(`€ ${total.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, ML + 415, ty, { width: 40, align: 'right' })
      doc.moveTo(ML, ty + 16).lineTo(MR, ty + 16).strokeColor('#e0e0e0').lineWidth(0.4).stroke()
      ty += 22
    })

    doc.moveTo(ML, ty).lineTo(MR, ty).strokeColor(accent).lineWidth(1).stroke()
    ty += 14

    // ── MwSt TABELLE ──────────────────────────────────────────────────────────
    const netto   = Number(invoice.amount) || 0
    const vatRate = (invoiceSettings?.vatRate ?? 19)
    const mwst    = invoiceSettings?.smallBusiness ? 0 : Math.round(netto * (vatRate / 100) * 100) / 100
    const brutto  = netto + mwst

    // Tax breakdown table (Tchibo-Stil)
    const txX = 280
    const txW = MR - txX
    doc.rect(txX, ty, txW, 14).fill('#f0f0f5')
    doc.fontSize(7).fillColor(GRAY).font('Helvetica-Bold')
      .text('NETTO (€)',    txX + 4,  ty + 3, { width: txW/4 - 4, align: 'right' })
      .text('MwSt. (€)',    txX + txW/4, ty + 3, { width: txW/4, align: 'right' })
      .text('MwSt. %',      txX + txW/2, ty + 3, { width: txW/4, align: 'right' })
      .text('GESAMT (€)',   txX + txW*3/4, ty + 3, { width: txW/4 - 4, align: 'right' })
    ty += 16
    doc.fontSize(9).fillColor(DARK).font('Helvetica')
      .text(`€ ${netto.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, txX + 4, ty, { width: txW/4 - 4, align: 'right' })
      .text(invoiceSettings?.smallBusiness ? '–' : `€ ${mwst.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, txX + txW/4, ty, { width: txW/4, align: 'right' })
      .text(invoiceSettings?.smallBusiness ? '§19 UStG' : `${vatRate}%`, txX + txW/2, ty, { width: txW/4, align: 'right' })
      .text(`€ ${brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, txX + txW*3/4, ty, { width: txW/4 - 4, align: 'right' })
    ty += 18

    // GESAMT Box
    doc.rect(txX, ty, txW, 26).fill(accent)
    doc.fontSize(11).fillColor('#ffffff').font('Helvetica-Bold')
      .text('RECHNUNGSBETRAG', txX + 8, ty + 7, { width: txW * 0.55 })
      .text(`€ ${brutto.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`, txX, ty + 7, { width: txW - 6, align: 'right' })
    ty += 38

    if (invoiceSettings?.smallBusiness) {
      doc.fontSize(7.5).fillColor(GRAY).font('Helvetica').text('Gemäß §19 UStG wird keine Umsatzsteuer berechnet und ausgewiesen.', txX, ty, { width: txW })
      ty += 14
    }

    // ── ZAHLUNGSINFO ──────────────────────────────────────────────────────────
    ty += 10
    doc.moveTo(ML, ty).lineTo(MR, ty).strokeColor('#e0e0e0').lineWidth(0.5).stroke()
    ty += 12

    const payUrl = `https://app.plexora.eu/pay/${invoice.invoiceId}`
    const hasBank = company.iban

    if (hasBank) {
      doc.fontSize(8.5).fillColor(MID).font('Helvetica-Bold').text('Bankverbindung:', ML, ty)
      ty += 14
      const bankLine = [company.bankName, `IBAN: ${company.iban}`, company.bic ? `BIC: ${company.bic}` : ''].filter(Boolean).join('  |  ')
      doc.fontSize(9).fillColor(DARK).font('Helvetica').text(bankLine, ML, ty)
      ty += 14
      const refLine = `Verwendungszweck: ${invNum}`
      doc.fontSize(9).fillColor(DARK).font('Helvetica').text(refLine, ML, ty)
      ty += 14
      if (company.paymentNote) {
        doc.fontSize(8).fillColor(GRAY).font('Helvetica').text(company.paymentNote, ML, ty, { width: 260 })
        ty += 14
      }
      // Also show online link
      doc.fontSize(8).fillColor(GRAY).font('Helvetica').text('Oder online bezahlen: ', ML, ty)
      doc.fontSize(8).fillColor('#7C3AED').font('Helvetica').text(payUrl, ML + 110, ty, { link: payUrl, underline: true })
    } else {
      doc.fontSize(8.5).fillColor(MID).font('Helvetica-Bold').text('Online bezahlen:', ML, ty)
      ty += 14
      doc.fontSize(9).fillColor('#7C3AED').font('Helvetica').text(payUrl, ML, ty, { link: payUrl, underline: true })
    }

    // QR Code — klein, rechts neben dem Zahlungsbereich
    try {
      const qrRes = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=48x48&data=${encodeURIComponent(payUrl)}&margin=1`)
      const qrBuf = Buffer.from(await qrRes.arrayBuffer())
      const qrStartY = ty - (hasBank ? 42 : 14)
      doc.image(qrBuf, MR - 48, qrStartY, { width: 48, height: 48 })
      doc.fontSize(6.5).fillColor(GRAY).font('Helvetica')
        .text('QR-Code', MR - 48, qrStartY + 50, { width: 48, align: 'center' })
    } catch {}

    // ── FOOTER ────────────────────────────────────────────────────────────────
    doc.rect(0, 810, W, 32).fill('#f5f5f7')
    const footerParts: string[] = []
    if (company.legalName || brand) footerParts.push(company.legalName || brand)
    if (company.street)         footerParts.push(company.street)
    if (company.zipCity)        footerParts.push(company.zipCity)
    if (company.vatId)          footerParts.push(`USt-ID: ${company.vatId}`)
    if (company.register)       footerParts.push(`${company.registerCourt || 'HRB'}: ${company.register}`)
    if (company.email)          footerParts.push(company.email)
    if (company.phone)          footerParts.push(company.phone)

    doc.fontSize(7.5).fillColor(GRAY).font('Helvetica')
      .text(footerParts.join('  ·  '), ML, 818, { width: MR - ML, align: 'center' })
    doc.fontSize(7.5).fillColor(GRAY).font('Helvetica')
      .text(`${brand} — Vielen Dank für Ihr Vertrauen!`, ML, 828, { width: MR - ML, align: 'center' })

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

  let branding = { brandName: 'Plexora', brandTagline: 'Business Platform', accentColor: '#EA580C' }
  try {
    const bs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: 'global' } }))
    if (bs.Item) branding = { ...branding, ...bs.Item }
  } catch {}

  let company: any = {}
  try {
    const cs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'company', scope: 'global' } }))
    if (cs.Item) company = cs.Item
  } catch {}

  let invoiceSettings = { vatRate: 19, smallBusiness: false, priceDisplay: 'netto' }
  try {
    const is = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'invoice', scope: 'global' } }))
    if (is.Item) invoiceSettings = { ...invoiceSettings, ...is.Item }
  } catch {}

  const pdfBuffer = await generatePDF(invoice, branding, company, invoiceSettings)

  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="Rechnung-${invoice.number || invoiceId?.slice(0,8)}.pdf"`)
  return pdfBuffer
})
