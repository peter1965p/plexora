import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const dynamo = getDynamoClient()
  const orderId = randomUUID()

  // Lieferant laden
  let supplier: any = {}
  if (body.supplierId) {
    try {
      const { ScanCommand } = await import('@aws-sdk/lib-dynamodb')
      const res = await dynamo.send(new ScanCommand({
        TableName: 'plexora-suppliers',
        FilterExpression: 'supplierId = :id',
        ExpressionAttributeValues: { ':id': body.supplierId }
      }))
      supplier = res.Items?.[0] || {}
    } catch {}
  }

  // Branding laden
  let branding = { brandName: 'Plexora' }
  try {
    const bs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: 'global' } }))
    if (bs.Item) branding = bs.Item as any
  } catch {}

  // Bestellung speichern
  await dynamo.send(new PutCommand({
    TableName: 'plexora-purchase-orders',
    Item: {
      orderId,
      userId: 'global',
      productId:    body.productId,
      productName:  body.productName,
      supplierId:   body.supplierId || '',
      supplierName: supplier.name || '—',
      quantity:     body.quantity,
      status:       'offen',
      notes:        body.notes || '',
      created:      new Date().toISOString(),
    }
  }))

  // Mail an Lieferant wenn Email vorhanden
  if (supplier.email) {
    try {
      const ses = new SESClient({ region: 'eu-central-1' })
      const subject = `Bestellung: ${body.productName} — ${branding.brandName}`
      const boundary = `----=_Part_${Date.now()}`
      const rawEmail = [
        `From: ${branding.brandName} <billing@plexora.eu>`,
        `To: ${supplier.email}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        `<html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto">`,
        `<h2>Bestellanfrage von ${branding.brandName}</h2>`,
        `<p>Sehr geehrte Damen und Herren,</p>`,
        `<p>wir möchten folgende Artikel bestellen:</p>`,
        `<table style="border-collapse:collapse;width:100%;margin:20px 0">`,
        `<tr style="background:#f5f5f5"><td style="padding:8px;border:1px solid #eee"><strong>Produkt</strong></td><td style="padding:8px;border:1px solid #eee"><strong>${body.productName}</strong></td></tr>`,
        `<tr><td style="padding:8px;border:1px solid #eee">Menge</td><td style="padding:8px;border:1px solid #eee"><strong>${body.quantity} Stück</strong></td></tr>`,
        body.notes ? `<tr><td style="padding:8px;border:1px solid #eee">Hinweise</td><td style="padding:8px;border:1px solid #eee">${body.notes}</td></tr>` : '',
        `<tr><td style="padding:8px;border:1px solid #eee">Bestell-Nr.</td><td style="padding:8px;border:1px solid #eee">${orderId.slice(0,8).toUpperCase()}</td></tr>`,
        `</table>`,
        `<p>Bitte bestätigen Sie die Bestellung per Rückantwort.</p>`,
        `<p>Mit freundlichen Grüßen<br>${branding.brandName}</p>`,
        `</body></html>`,
      ].join('\r\n')
      await ses.send(new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(rawEmail) } }))
    } catch (err) { console.error('Bestellmail fehlgeschlagen:', err) }
  }

  return { success: true, orderId }
})
