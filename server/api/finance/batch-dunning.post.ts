import { ScanCommand, UpdateCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const dynamo = getDynamoClient()
  const ses    = new SESClient({ region: 'eu-central-1' })

  // Branding laden
  let branding = { brandName: 'Plexora', brandTagline: 'Business Platform' }
  try {
    const bs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: 'global' } }))
    if (bs.Item) branding = bs.Item as any
  } catch {}

  // Dunning Settings laden
  let dunningSettings = {
    level1: { active: true, days: 5,  fee: 0,  text: 'Wir möchten Sie freundlich daran erinnern, dass die folgende Rechnung noch offen ist.' },
    level2: { active: true, days: 14, fee: 15, text: 'Trotz unserer ersten Mahnung haben wir noch keinen Zahlungseingang verbuchen können.' },
    level3: { active: true, days: 30, fee: 40, text: 'Dies ist unsere letzte Mahnung. Bei Nichtbegleichung übergeben wir die Forderung an ein Inkassounternehmen.' },
  }
  try {
    const ds = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'dunning', scope: 'global' } }))
    if (ds.Item) dunningSettings = ds.Item as any
  } catch {}

  // Alle offenen Rechnungen scannen
  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: '#st IN (:pending, :d1, :d2)',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':pending': 'pending', ':d1': 'dunning_1', ':d2': 'dunning_2' }
  }))

  const today    = new Date()
  const results  = { processed: 0, mailed: 0, inkasso: 0, skipped: 0 }

  for (const invoice of (scan.Items || [])) {
    if (!invoice.dueDate) { results.skipped++; continue }

    const dueDate   = new Date(invoice.dueDate)
    const daysLate  = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    const curLevel  = invoice.dunningLevel || 0

    let nextLevel = 0
    if (daysLate >= dunningSettings.level3.days && curLevel < 3 && dunningSettings.level3.active) nextLevel = 3
    else if (daysLate >= dunningSettings.level2.days && curLevel < 2 && dunningSettings.level2.active) nextLevel = 2
    else if (daysLate >= dunningSettings.level1.days && curLevel < 1 && dunningSettings.level1.active) nextLevel = 1

    if (!nextLevel) { results.skipped++; continue }

    results.processed++

    // Stufe 3 → Inkasso-Warnung, keine Mail
    if (nextLevel === 3) {
      // Notification erstellen
      await dynamo.send(new PutCommand({
        TableName: 'plexora-notifications',
        Item: {
          notificationId: randomUUID(),
          userId:         invoice.userId,
          type:           'inkasso_warning',
          title:          '⚠️ Inkasso-Übergabe erforderlich',
          message:        `Rechnung ${invoice.number || invoice.invoiceId?.slice(0,8)} von ${invoice.client} (€ ${invoice.amount}) — Eingreifen erforderlich!`,
          invoiceId:      invoice.invoiceId,
          read:           false,
          created:        new Date().toISOString(),
        }
      }))

      // Status auf inkasso_pending setzen
      await dynamo.send(new UpdateCommand({
        TableName: 'plexora-finance',
        Key: { userId: invoice.userId, invoiceId: invoice.invoiceId },
        UpdateExpression: 'SET #st = :st, dunningLevel = :dl, dunningDate = :dd',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':st': 'inkasso_pending', ':dl': 3, ':dd': new Date().toISOString() }
      }))

      results.inkasso++
      continue
    }

    // Stufe 1 oder 2 → Mail senden
    const levelConfig = nextLevel === 1 ? dunningSettings.level1 : dunningSettings.level2
    const labels      = { 1: '1. Mahnung', 2: '2. Mahnung — Letzte Zahlungsaufforderung' }
    const label       = labels[nextLevel as 1 | 2]
    const newStatus   = nextLevel === 1 ? 'dunning_1' : 'dunning_2'
    const netto       = Number(invoice.amount) || 0
    const brutto      = netto + Math.round(netto * 0.19 * 100) / 100
    const total       = brutto + (levelConfig.fee || 0)

    if (invoice.clientEmail) {
      try {
        const subject  = `${label}: Rechnung ${invoice.number || invoice.invoiceId?.slice(0,8)} — ${branding.brandName}`
        const boundary = `----=_Part_${Date.now()}`
        const payUrl   = `https://app.plexora.eu/pay/${invoice.invoiceId}`

        const rawEmail = [
          `From: ${branding.brandName} <billing@plexora.eu>`,
          `To: ${invoice.clientEmail}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          ``,
          `--${boundary}`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          `<html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto">`,
          `<h2 style="color:#E05C5C">${label}</h2>`,
          `<p>Sehr geehrte/r ${invoice.client},</p>`,
          `<p>${levelConfig.text}</p>`,
          `<table style="border-collapse:collapse;width:100%;margin:20px 0">`,
          `<tr style="background:#fff5f5"><td style="padding:8px;border:1px solid #eee">Rechnungsnummer</td><td style="padding:8px;border:1px solid #eee"><strong>${invoice.number || invoice.invoiceId?.slice(0,8)}</strong></td></tr>`,
          `<tr><td style="padding:8px;border:1px solid #eee">Fällig seit</td><td style="padding:8px;border:1px solid #eee"><strong>${invoice.dueDate}</strong></td></tr>`,
          `<tr><td style="padding:8px;border:1px solid #eee">Offener Betrag</td><td style="padding:8px;border:1px solid #eee"><strong>€ ${brutto.toLocaleString('de-DE')}</strong></td></tr>`,
          levelConfig.fee > 0 ? `<tr><td style="padding:8px;border:1px solid #eee">Mahngebühr</td><td style="padding:8px;border:1px solid #eee"><strong>€ ${levelConfig.fee}</strong></td></tr>` : '',
          `<tr style="background:#E05C5C;color:white"><td style="padding:8px"><strong>Gesamtbetrag</strong></td><td style="padding:8px"><strong>€ ${total.toLocaleString('de-DE')}</strong></td></tr>`,
          `</table>`,
          `<div style="text-align:center;margin:24px 0">`,
          `<a href="${payUrl}" style="background:#ea580c;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px">Jetzt online bezahlen</a>`,
          `</div>`,
          `<p style="color:#999;font-size:12px">– Das ${branding.brandName} Team</p>`,
          `</body></html>`,
          ``,
          `--${boundary}--`,
        ].join('\r\n')

        await ses.send(new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(rawEmail) } }))
        results.mailed++
      } catch (err) {
        console.error('Mail fehlgeschlagen:', invoice.invoiceId, err)
      }
    }

    // Status updaten
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-finance',
      Key: { userId: invoice.userId, invoiceId: invoice.invoiceId },
      UpdateExpression: 'SET #st = :st, dunningLevel = :dl, dunningDate = :dd',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':st': newStatus, ':dl': nextLevel, ':dd': new Date().toISOString() }
    }))
  }

  return { success: true, ...results }
})
