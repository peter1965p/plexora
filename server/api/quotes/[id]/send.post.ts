import { Resend } from 'resend'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireMailSender, validRecipient } from '../../../utils/mailGuard'
import { assertMailQuota } from '../../../utils/mailQuota'
import { loadOwnedQuote, loadTenantSettings, newAcceptSecret, hashSecret, makeRef, ownerView, QUOTES_TABLE } from '../../../utils/quoteStore'
import { renderQuotePdf, acceptUrl } from '../../../utils/quotePdf'
import { effectiveStatus, todayIso } from '../../../../shared/quotes'
import { escapeText } from '../../../../shared/mailTemplate'

// Angebot per Mail senden (PDF im Anhang + Link zum Online-Annehmen). Empfänger nur aus dem Angebot. Aus Entwurf oder abgelaufen (dann neu mit gültigem Datum).
// Bei jedem Senden entsteht ein neuer Annahme-Link; ein früherer wird ungültig.
export default defineEventHandler(async (event) => {
  requireMailSender(event)                                           // Anmeldung Pflicht, Demo-Konto gesperrt
  const { tenantId, quote } = await loadOwnedQuote(event)
  const eff = effectiveStatus(quote)
  if (eff !== 'draft' && eff !== 'sent') throw createError({ statusCode: 409, message: eff === 'expired' ? 'Die Gültigkeit ist abgelaufen. Ändere „Gültig bis“, dann lässt es sich senden.' : 'Dieses Angebot ist schon abgeschlossen.' })
  if (quote.validUntil < todayIso()) throw createError({ statusCode: 422, message: '„Gültig bis“ liegt in der Vergangenheit.' })
  const to = validRecipient(quote.clientEmail)
  if (!to) throw createError({ statusCode: 422, message: 'Das Angebot hat keine gültige Kunden-E-Mail-Adresse.' })

  const ctx = await loadTenantSettings(tenantId)
  const secret = newAcceptSecret(), ref = makeRef(quote.quoteId, secret), link = acceptUrl(ref)
  const pdf = await renderQuotePdf(quote, ctx, link)
  await assertMailQuota({ tenantId, pool: 'system', recipients: [to], what: 'quote' })      // Tageslimit des Mandanten (Tarif)
  const brand = escapeText(ctx.branding.brandName || 'Plexora'), nr = escapeText(quote.number)
  const gross = Number(quote.gross).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
  const until = new Date(quote.validUntil + 'T00:00:00').toLocaleDateString('de-DE')
  const resend = new Resend(useRuntimeConfig().resendApiKey as string)
  const res = await resend.emails.send({
    from: `${ctx.branding.brandName || 'Plexora'} <angebote@plexora.eu>`, to, subject: `Angebot ${quote.number} von ${ctx.branding.brandName || 'Plexora'}`,
    html: `<html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto"><h2 style="color:#ea580c">${brand}</h2><p>Guten Tag ${escapeText(quote.client)},</p>
<p>im Anhang finden Sie unser Angebot <strong>${nr}</strong>${quote.title ? ` „${escapeText(quote.title)}“` : ''} über <strong>${escapeText(gross)}</strong> (brutto). Es ist gültig bis <strong>${escapeText(until)}</strong>.</p>
<p style="margin:24px 0"><a href="${escapeText(link)}" style="background:#ea580c;color:#fff;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:bold">Angebot ansehen und annehmen</a></p>
<p style="font-size:12px;color:#777">Funktioniert der Knopf nicht? Diese Adresse in den Browser kopieren:<br>${escapeText(link)}</p><p style="color:#999;font-size:12px">– ${brand}</p></body></html>`,
    text: `Guten Tag ${quote.client},\n\nim Anhang finden Sie unser Angebot ${quote.number} über ${gross} (brutto), gültig bis ${until}.\nOnline ansehen und annehmen: ${link}\n\n– ${ctx.branding.brandName || 'Plexora'}`,
    attachments: [{ filename: `Angebot-${String(quote.number).replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`, content: pdf }],
  })
  if ((res as any)?.error) throw createError({ statusCode: 502, message: 'Die E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.' })
  const upd = await getDynamoClient().send(new UpdateCommand({
    TableName: QUOTES_TABLE, Key: { userId: tenantId, quoteId: quote.quoteId }, UpdateExpression: 'SET #s = :sent, acceptHash = :h, sentAt = :at, updated = :at',
    ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':sent': 'sent', ':h': hashSecret(secret), ':at': new Date().toISOString() }, ReturnValues: 'ALL_NEW',
  }))
  return { success: true, message: `Angebot an ${to} gesendet`, quote: ownerView(upd.Attributes!) }
})
