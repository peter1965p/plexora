import Stripe from 'stripe'
import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { Resend } from 'resend'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const config  = useRuntimeConfig()
  const stripe  = new Stripe(config.stripeSecretKey as string)
  const dynamo  = getDynamoClient()
  const body    = await readRawBody(event)
  const sig     = getHeader(event, 'stripe-signature')

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(body!, sig!, config.stripeWebhookSecret as string || '')
  } catch {
    // In Test-Modus ohne Webhook Secret direkt parsen
    stripeEvent = JSON.parse(body!) as Stripe.Event
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session
    const orderId = session.metadata?.orderId
    const email   = session.customer_email || session.customer_details?.email

    if (orderId) {
      // Order Status updaten
      const scan = await dynamo.send(new ScanCommand({
        TableName: 'plexora-orders',
        FilterExpression: 'orderId = :id',
        ExpressionAttributeValues: { ':id': orderId }
      }))
      const order = scan.Items?.[0]

      if (order) {
        await dynamo.send(new UpdateCommand({
          TableName: 'plexora-orders',
          Key: { userId: order.userId, orderId },
          UpdateExpression: 'SET #st = :st, stripeSessionId = :sid, paidAt = :pa',
          ExpressionAttributeNames: { '#st': 'status' },
          ExpressionAttributeValues: { ':st': 'paid', ':sid': session.id, ':pa': new Date().toISOString() }
        }))
      }

      // Bestätigungsmail
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
  }

  return { received: true }
})
