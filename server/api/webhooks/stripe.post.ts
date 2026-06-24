import Stripe from 'stripe'
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { Resend } from 'resend'
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider'
import { getDynamoClient } from '../../utils/dynamodb'
import { generateLicenseKey, TIER_MODULES, TIER_LABELS } from '../../utils/license'
import { randomUUID, randomBytes } from 'crypto'

export default defineEventHandler(async (event) => {
  const config  = useRuntimeConfig()
  const stripe  = new Stripe(config.stripeSecretKey as string)
  const dynamo  = getDynamoClient()
  const resend  = new Resend(config.resendApiKey as string)

  // Cognito-Client — in Lambda via IAM-Role, lokal via Env-Vars
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME
  const cognito  = isLambda
    ? new CognitoIdentityProviderClient({ region: 'eu-central-1' })
    : new CognitoIdentityProviderClient({
        region: 'eu-central-1',
        credentials: {
          accessKeyId:     (process.env.NUXT_AWS_ACCESS_KEY_ID || '').replace(/^"|"$/g, ''),
          secretAccessKey: (process.env.NUXT_AWS_SECRET_ACCESS_KEY || '').replace(/^"|"$/g, ''),
        },
      })
  const userPoolId = (config.public as any).awsUserPoolId as string || 'eu-central-1_lM7sN6LvC'

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
    const session  = stripeEvent.data.object as Stripe.Checkout.Session
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
        try {
          await resend.emails.send({
            from:    'Plexora <noreply@plexora.eu>',
            to:      customerEmail,
            subject: `Willkommen bei Plexora — ${productName}`,
            html: `
              <html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto">
                <h1 style="color:#ea580c">Willkommen bei Plexora! 🎉</h1>
                <p>Hallo ${customerName},</p>
                <p>vielen Dank für deinen Kauf von <strong>${productName}</strong>!</p>
                <p>Dein Zugang wird in Kürze eingerichtet. Du erhältst eine weitere E-Mail mit deinen Login-Daten.</p>
                <div style="margin:32px 0;text-align:center">
                  <a href="https://app.plexora.eu" style="background:#ea580c;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold">Zu Plexora</a>
                </div>
                <p style="color:#999;font-size:12px">Das Plexora Team</p>
              </body></html>`,
          })
          console.log(`✅ Welcome Mail an ${customerEmail}`)
        } catch (err) { console.error('Welcome Mail fehlgeschlagen:', err) }
      }

      console.log(`✅ Shop-Kauf: Tenant ${tenantId} für ${customerEmail}`)
    }

    // ── FALL 3: Plexora Lizenz-Kauf → Lizenz + Cognito-User + kombinierte Mail
    if (metadata.type === 'license_purchase') {
      const tier          = metadata.tier || 'pro'
      const customerEmail = session.customer_details?.email || metadata.email || ''
      const customerName  = session.customer_details?.name  || customerEmail.split('@')[0] || 'Kunde'
      const licenseKey    = generateLicenseKey()
      const now           = new Date().toISOString()
      const tierLabel     = TIER_LABELS[tier] || tier
      const moduleCount   = (TIER_MODULES[tier] || []).length

      // 1. Lizenz in DynamoDB speichern
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
      console.log(`✅ Lizenz erstellt: ${licenseKey} (${tier}) für ${customerEmail}`)

      // 2. Cognito-User anlegen (Passwort = einmalig, SUPPRESS = kein Cognito-Default-Mail)
      // Passwort: "Plx" + 8 Hex-Zeichen (Großbuchstaben) + "!1" → 13 Zeichen, alle Regeln erfüllt
      const tempPassword = `Plx${randomBytes(4).toString('hex').toUpperCase()}!1`
      let cognitoCreated = false

      if (customerEmail) {
        try {
          await cognito.send(new AdminCreateUserCommand({
            UserPoolId:      userPoolId,
            Username:        customerEmail,
            TemporaryPassword: tempPassword,
            MessageAction:   'SUPPRESS',
            UserAttributes:  [
              { Name: 'email',          Value: customerEmail },
              { Name: 'email_verified', Value: 'true' },
              { Name: 'name',           Value: customerName },
            ],
          }))
          cognitoCreated = true
          console.log(`✅ Cognito-User angelegt: ${customerEmail}`)

          await cognito.send(new AdminAddUserToGroupCommand({
            UserPoolId: userPoolId,
            Username:   customerEmail,
            GroupName:  'customers',
          }))
          console.log(`✅ Cognito-User zur Gruppe "customers" hinzugefügt`)
        } catch (cogErr: any) {
          if (cogErr.name === 'UsernameExistsException') {
            console.log(`ℹ️  Cognito-User existiert bereits: ${customerEmail}`)
          } else {
            console.error('Cognito-Fehler:', cogErr)
          }
        }
      }

      // 3. Kombinierte Mail — Login-Daten + Lizenz-Key in einer Mail
      if (customerEmail) {
        const loginSection = cognitoCreated
          ? `
          <div style="background:#f0fdf4;border:1px solid #22c55e;border-radius:12px;padding:20px 24px;margin:24px 0">
            <div style="font-weight:700;font-size:15px;color:#166534;margin-bottom:12px">Deine Login-Daten</div>
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="padding:6px 0;color:#555;width:120px;font-size:13px">E-Mail</td>
                <td style="padding:6px 0;font-weight:600;font-size:13px">${customerEmail}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;color:#555;font-size:13px">Temp. Passwort</td>
                <td style="padding:6px 0;font-weight:700;font-size:13px;letter-spacing:1px;font-family:monospace">${tempPassword}</td>
              </tr>
            </table>
            <p style="font-size:12px;color:#555;margin:12px 0 0">Beim ersten Login wirst du aufgefordert, dein Passwort zu ändern.</p>
          </div>`
          : `
          <div style="background:#eff6ff;border:1px solid #3b82f6;border-radius:12px;padding:16px 24px;margin:24px 0">
            <p style="margin:0;color:#1e40af;font-size:13px">Du hast bereits einen Account — logge dich einfach mit deiner E-Mail-Adresse ein.</p>
          </div>`

        try {
          await resend.emails.send({
            from:    'Plexora <billing@plexora.eu>',
            to:      customerEmail,
            subject: `Dein Plexora ${tierLabel} — Login & Lizenz-Key`,
            html: [
              `<html><body style="font-family:sans-serif;color:#333;max-width:600px;margin:0 auto;padding:32px">`,
              `<div style="text-align:center;margin-bottom:32px"><div style="display:inline-block;background:#6C3FE8;border-radius:12px;padding:10px 18px"><span style="color:#fff;font-weight:900;font-size:18px;letter-spacing:1px">PLEXORA</span></div></div>`,
              `<h1 style="color:#6C3FE8;margin:0 0 8px">Willkommen bei Plexora! 🎉</h1>`,
              `<p style="color:#555;margin:0 0 24px">Hallo ${customerName}, vielen Dank für deinen Kauf von <strong>Plexora ${tierLabel}</strong>.<br>Alles was du brauchst findest du direkt in dieser Mail.</p>`,
              loginSection,
              `<div style="background:#f5f3ff;border:2px solid #6C3FE8;border-radius:12px;padding:20px 28px;margin:24px 0;text-align:center">`,
              `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#7c6ab5;margin-bottom:8px">Dein persönlicher Lizenz-Key</div>`,
              `<code style="font-size:26px;font-weight:900;letter-spacing:5px;color:#6C3FE8">${licenseKey}</code>`,
              `<div style="margin-top:10px;font-size:12px;color:#7c6ab5">${moduleCount} Module freigeschaltet · ${tierLabel} Plan</div>`,
              `</div>`,
              `<div style="text-align:center;margin:32px 0"><a href="https://app.plexora.eu/portal" style="background:#6C3FE8;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px">Zum Kunden-Portal</a></div>`,
              `<p style="font-size:12px;color:#aaa;border-top:1px solid #eee;padding-top:20px;margin-top:32px">Das Plexora Team · <a href="mailto:billing@plexora.eu" style="color:#6C3FE8">billing@plexora.eu</a></p>`,
              `</body></html>`,
            ].join(''),
          })
          console.log(`✅ Kombinierte Login+Lizenz-Mail an ${customerEmail}`)
        } catch (err) { console.error('Lizenz-Mail fehlgeschlagen:', err) }
      }
    }
  }

  return { received: true }
})
