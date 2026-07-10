import Stripe from 'stripe'
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { Resend } from 'resend'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const config  = useRuntimeConfig()
  const dynamo  = getDynamoClient()
  const body    = await readRawBody(event)
  const sig     = getHeader(event, 'stripe-signature')

  let stripeKey = config.stripeSecretKey as string
  let webhookSecret = config.stripeWebhookSecret as string || ''
  try {
    const ps = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'payment', scope: 'global' } }))
    if (ps.Item?.stripeSecretKey) stripeKey = ps.Item.stripeSecretKey
    if (ps.Item?.stripeWebhookSecret) webhookSecret = ps.Item.stripeWebhookSecret
  } catch {}
  const stripe = new Stripe(stripeKey)

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body!, sig!, webhookSecret)
  } catch (err: any) {
    console.error('Shop-Webhook Signatur ungültig:', err.message)
    throw createError({ statusCode: 400, message: `Webhook Error: ${err.message}` })
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session
    const orderId  = session.metadata?.orderId
    const buyerId  = session.metadata?.userId
    const email    = session.customer_email || session.customer_details?.email

    if (orderId && buyerId) {
      try {
        const orderRes = await dynamo.send(new GetCommand({ TableName: 'plexora-orders', Key: { userId: buyerId, orderId } }))
        const order = orderRes.Item

        if (order) {
          await dynamo.send(new UpdateCommand({
            TableName: 'plexora-orders',
            Key: { userId: order.userId, orderId },
            UpdateExpression: 'SET #st = :st, stripeSessionId = :sid, paidAt = :pa',
            ConditionExpression: '#st <> :st',
            ExpressionAttributeNames: { '#st': 'status' },
            ExpressionAttributeValues: { ':st': 'paid', ':sid': session.id, ':pa': new Date().toISOString() }
          }))

          // Bestand pro Position reduzieren (einmalig dank ConditionExpression oben)
          for (const line of (order.items || [])) {
            if (!line.productId) continue
            const p = await dynamo.send(new GetCommand({ TableName: 'plexora-products', Key: { userId: order.sellerUserId, productId: line.productId } }))
            if (!p.Item) continue
            const newStock = Math.max(0, (Number(p.Item.stock) || 0) - Number(line.qty || 0))
            await dynamo.send(new UpdateCommand({
              TableName: 'plexora-products',
              Key: { userId: order.sellerUserId, productId: line.productId },
              UpdateExpression: 'SET stock = :s, updated = :u',
              ExpressionAttributeValues: { ':s': newStock, ':u': new Date().toISOString() },
            }))
          }

          if (email) {
            try {
              const resend = new Resend(config.resendApiKey as string)
              await resend.emails.send({
                from:    'Plexora Shop <billing@plexora.eu>',
                to:      email,
                subject: `Bestellung bestätigt — ${orderId.slice(0,8).toUpperCase()}`,
                html: `
                  <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                    <h2 style="color:#ea580c">Bestellung bestätigt!</h2>
                    <p>Vielen Dank für Ihre Bestellung.</p>
                    <p>Bestellnummer: <strong>${orderId.slice(0,8).toUpperCase()}</strong></p>
                    <p>Wir bearbeiten Ihre Bestellung und melden uns in Kürze.</p>
                  </div>`,
              })
            } catch (e: any) {
              console.log('Mail Fehler:', e.message)
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'ConditionalCheckFailedException') throw err
        // Order war schon 'paid' — Stripe-Retry, Bestand wurde beim ersten Aufruf schon reduziert
      }
    }
  }

  return { received: true }
})
