import Stripe from 'stripe'
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses'
import { getDynamoClient } from '../../utils/dynamodb'
import { generateLicenseKey, TIER_MODULES, TIER_LABELS } from '../../utils/license'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const config  = useRuntimeConfig()
  const stripe  = new Stripe(config.stripeSecretKey as string)
  const dynamo  = getDynamoClient()
  const ses     = new SESClient({ region: 'eu-central-1' })

  // Raw Body für Stripe Signatur-Validierung
  const rawBody = await readRawBody(event)
  const sig     = getHeader(event, 'stripe-signature') || ''
  // Webhook Secret aus DynamoDB (Settings UI) oder Env
  let webhookSecret = process.env.NUXT_STRIPE_WEBHOOK_SECRET || ''
  try {
    const ps = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'payment', scope: 'global' }
    }))
    if (ps.Item?.stripeWebhookSecret) webhookSecret = ps.Item.stripeWebhookSecret
  } catch {}

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody!, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook Signatur ungültig:', err.message)
    throw createError({ statusCode: 400, message: `Webhook Error: ${err.message}` })
  }

  // checkout.session.completed → Rechnung bezahlt ODER Shop-Kauf
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    // ── FALL 1: Rechnung bezahlt ────────────────────────────────────────────
    if (metadata.invoiceId && metadata.userId) {
      await dynamo.send(new UpdateCommand({
        TableName: 'plexora-finance',
        Key: { userId: metadata.userId, invoiceId: metadata.invoiceId },
        UpdateExpression: 'SET #st = :st, paidAt = :p, stripeSessionId = :sid',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: {
          ':st':  'paid',
          ':p':   new Date().toISOString(),
          ':sid': session.id
        }
      }))
      console.log(`✅ Rechnung ${metadata.invoiceId} als bezahlt markiert`)
    }

    // ── FALL 2: Shop-Kauf → Onboarding ─────────────────────────────────────
    if (metadata.type === 'shop_purchase') {
      const customerEmail = session.customer_details?.email || ''
      const customerName  = session.customer_details?.name  || 'Kunde'
      const productName   = metadata.productName || 'Plexora'
      const tenantId      = randomUUID()

      // Tenant anlegen
      await dynamo.send(new PutCommand({
        TableName: 'plexora-tenants',
        Item: {
          tenantId,
          email:       customerEmail,
          name:        customerName,
          productId:   metadata.productId || '',
          productName,
          stripeSession: session.id,
          status:      'active',
          created:     new Date().toISOString(),
        }
      }))

      // Stock reduzieren
      if (metadata.productId) {
        try {
          await dynamo.send(new UpdateCommand({
            TableName: 'plexora-products',
            Key: { userId: metadata.productUserId || 'demo-user', productId: metadata.productId },
            UpdateExpression: 'SET stock = stock - :one',
            ExpressionAttributeValues: { ':one': 1 }
          }))
        } catch {}
      }

      // Welcome Mail
      if (customerEmail) {
        const subject = `Willkommen bei Plexora — ${productName}`
        const rawEmail = [
          `From: Plexora <billing@paeffgen-it.de>`,
          `To: ${customerEmail}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          `<html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto">`,
          `<h1 style="color:#7C3AED">Willkommen bei Plexora! 🎉</h1>`,
          `<p>Hallo ${customerName},</p>`,
          `<p>vielen Dank für deinen Kauf von <strong>${productName}</strong>!</p>`,
          `<p>Dein Zugang wird in Kürze eingerichtet. Du erhältst eine weitere E-Mail mit deinen Login-Daten.</p>`,
          `<div style="margin:32px 0;text-align:center">`,
          `<a href="https://plexora.paeffgen-it.de" style="background:#7C3AED;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Zu Plexora</a>`,
          `</div>`,
          `<p style="color:#999;font-size:12px">Das Plexora Team</p>`,
          `</body></html>`,
        ].join('\r\n')

        try {
          await ses.send(new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(rawEmail) } }))
          console.log(`✅ Welcome Mail an ${customerEmail}`)
        } catch (err) { console.error('Welcome Mail fehlgeschlagen:', err) }
      }

      console.log(`✅ Shop-Kauf: Tenant ${tenantId} für ${customerEmail}`)
    }

    // ── FALL 3: Plexora Lizenz-Kauf ────────────────────────────────────────
    if (metadata.type === 'license_purchase') {
      const tier          = metadata.tier || 'pro'
      const customerEmail = session.customer_details?.email || metadata.email || ''
      const customerName  = session.customer_details?.name  || customerEmail.split('@')[0] || 'Kunde'
      const licenseKey    = generateLicenseKey()
      const now           = new Date().toISOString()

      await dynamo.send(new PutCommand({
        TableName: 'plexora-licenses',
        Item: {
          licenseKey,
          customerEmail,
          customerName,
          tier,
          status:          'active',
          modules:         TIER_MODULES[tier] || [],
          validFrom:       now,
          validUntil:      null,
          stripeSessionId: session.id,
          created:         now,
          updated:         now,
        }
      }))

      // Welcome-Mail mit Lizenz-Key
      if (customerEmail) {
        const tierLabel  = TIER_LABELS[tier] || tier
        const subject    = `Dein Plexora ${tierLabel} Lizenz-Key`
        const rawEmail   = [
          `From: Plexora <billing@paeffgen-it.de>`,
          `To: ${customerEmail}`,
          `Subject: ${subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=UTF-8`,
          ``,
          `<html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto;padding:32px">`,
          `<h1 style="color:#6C3FE8;margin-bottom:8px">Willkommen bei Plexora! 🎉</h1>`,
          `<p>Hallo ${customerName},</p>`,
          `<p>vielen Dank für deinen Kauf von <strong>Plexora ${tierLabel}</strong>.</p>`,
          `<p>Dein persönlicher Lizenz-Key:</p>`,
          `<div style="background:#f5f3ff;border:2px solid #6C3FE8;border-radius:12px;padding:20px 28px;margin:24px 0;text-align:center">`,
          `<code style="font-size:24px;font-weight:900;letter-spacing:4px;color:#6C3FE8">${licenseKey}</code>`,
          `</div>`,
          `<p>Freigeschaltete Module: <strong>${(TIER_MODULES[tier] || []).length} Module</strong></p>`,
          `<p>Du findest deinen Key jederzeit in deinem <a href="https://plexora.paeffgen-it.de/portal" style="color:#6C3FE8">Kunden-Portal</a>.</p>`,
          `<p style="color:#999;font-size:12px;margin-top:40px">Das Plexora Team · billing@paeffgen-it.de</p>`,
          `</body></html>`,
        ].join('\r\n')

        try {
          await ses.send(new SendRawEmailCommand({ RawMessage: { Data: Buffer.from(rawEmail) } }))
          console.log(`✅ Lizenz-Key Mail an ${customerEmail}: ${licenseKey}`)
        } catch (err) { console.error('Lizenz-Mail fehlgeschlagen:', err) }
      }

      console.log(`✅ Lizenz erstellt: ${licenseKey} (${tier}) für ${customerEmail}`)
    }
  }

  return { received: true }
})
