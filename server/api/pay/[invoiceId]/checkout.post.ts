import { GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'invoiceId')
  const dynamo    = getDynamoClient()

  // Rechnung laden
  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'invoiceId = :id',
    ExpressionAttributeValues: { ':id': invoiceId }
  }))
  const invoice = scan.Items?.[0]
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })

  // Payment Settings laden
  const ps = await dynamo.send(new GetCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'payment', scope: 'global' }
  }))
  const paySettings = ps.Item

  // Branding laden
  const bs = await dynamo.send(new GetCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'branding', scope: 'global' }
  }))
  const brandName = bs.Item?.brandName || 'Plexora'

  const gateway = paySettings?.activeGateway || 'stripe'
  const origin  = getHeader(event, 'origin') || 'https://app.plexora.eu'
  const netto   = Number(invoice.amount) || 0
  const brutto  = Math.round(netto * 1.19 * 100) // Cents

  if (gateway === 'stripe') {
    const secretKey = paySettings?.stripeSecretKey || useRuntimeConfig().stripeSecretKey
    const stripe = new Stripe(secretKey as string)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Rechnung ${invoice.number || invoiceId?.slice(0,8).toUpperCase()} — ${brandName}`,
          },
          unit_amount: brutto,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/pay/${invoiceId}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/pay/${invoiceId}`,
      customer_email: invoice.clientEmail || undefined,
      metadata: { invoiceId: invoiceId!, userId: invoice.userId || '', source: 'invoice-pay' },
    })
    return { url: session.url }
  }

  throw createError({ statusCode: 400, message: `Gateway ${gateway} noch nicht implementiert` })
})
