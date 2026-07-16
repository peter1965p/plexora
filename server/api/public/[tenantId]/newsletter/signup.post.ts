import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { checkRateLimit } from '../../../../utils/rateLimit'
import { buildConfirmEmailHtml } from '../../../../utils/newsletterEmail'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const body     = await readBody(event)
  const email    = String(body?.email || '').trim().toLowerCase()

  // Honeypot: ein für echte Nutzer unsichtbares Feld, das nur Bots ausfüllen.
  // Ausgefüllt → so tun, als wäre alles gut, ohne irgendetwas zu verarbeiten.
  if (body?.website) return { success: true }

  if (!tenantId || !EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, message: 'Ungültige E-Mail-Adresse' })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const [ipOk, emailOk] = await Promise.all([
    checkRateLimit('signup-ip', ip, 10, 3600),
    checkRateLimit('signup-email', email, 3, 3600),
  ])
  if (!ipOk || !emailOk) {
    // Generische Antwort statt 429 — verrät einem Angreifer nicht, dass gedrosselt wurde
    return { success: true }
  }

  const dynamo = getDynamoClient()
  const existing = await dynamo.send(new GetCommand({
    TableName: 'plexora-newsletter-subscribers',
    Key: { tenantId, email },
  }))

  // Bereits bestätigt: nichts tun, aber nach außen dieselbe generische Antwort geben
  // (kein Leak, ob eine Adresse schon abonniert ist)
  if (existing.Item?.status === 'confirmed') {
    return { success: true }
  }

  const now = new Date().toISOString()
  const confirmToken = randomUUID()
  // Bestehender Datensatz (pending erneut, oder unsubscribed/bounced → Re-Opt-in) wird
  // überschrieben, aber subscriberId und Tags bleiben erhalten falls schon vorhanden.
  await dynamo.send(new PutCommand({
    TableName: 'plexora-newsletter-subscribers',
    Item: {
      tenantId,
      email,
      subscriberId:      existing.Item?.subscriberId || randomUUID(),
      status:             'pending',
      tags:               existing.Item?.tags || [],
      confirmToken,
      unsubscribeToken:   existing.Item?.unsubscribeToken || randomUUID(),
      consentTimestamp:   now,
      consentIp:          ip,
      consentSource:      'signup-form',
      createdAt:          existing.Item?.createdAt || now,
    },
  }))

  try {
    const apiBase = useRuntimeConfig().public.apiBase as string
    const confirmUrl = `${apiBase}/api/public/newsletter/confirm/${confirmToken}`
    const resend = new Resend(useRuntimeConfig().resendApiKey as string)
    await resend.emails.send({
      from:    'Plexora Newsletter <newsletter@plexora.eu>',
      to:      email,
      subject: 'Bitte bestätige deine Newsletter-Anmeldung',
      html:    buildConfirmEmailHtml(confirmUrl),
    })
  } catch (err) {
    console.error('Newsletter-Bestätigungsmail fehlgeschlagen:', err)
  }

  return { success: true }
})
