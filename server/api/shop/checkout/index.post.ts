import Stripe from 'stripe'
import { GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const config = useRuntimeConfig()
  const dynamo  = getDynamoClient()

  let stripeKey = config.stripeSecretKey as string
  try {
    const ps = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'payment', scope: 'global' }
    }))
    if (ps.Item?.stripeSecretKey) stripeKey = ps.Item.stripeSecretKey
  } catch {}
  const stripe = new Stripe(stripeKey)

  // Branding laden
  let brandName = 'Plexora'
  try {
    const bs = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'branding', scope: 'global' } }))
    if (bs.Item?.brandName) brandName = bs.Item.brandName
  } catch {}

  // Cart Items validieren + Stripe Line Items bauen
  const lineItems = []
  const cartItems = body.items || []

  for (const item of cartItems) {
    const result = await dynamo.send(new ScanCommand({
      TableName: 'plexora-products',
      FilterExpression: 'productId = :id',
      ExpressionAttributeValues: { ':id': item.productId }
    }))
    const product = result.Items?.[0]
    if (!product) continue

    lineItems.push({
      price_data: {
        currency: product.currency || 'eur',
        product_data: {
          name:        product.name,
          description: product.description || undefined,
          images:      product.image ? [product.image] : undefined,
        },
        unit_amount: Math.round(product.price * 100), // Stripe erwartet Cents
      },
      quantity: item.quantity || 1,
    })
  }

  if (!lineItems.length) throw createError({ statusCode: 400, message: 'Keine gültigen Produkte' })

  // Order vorab in DynamoDB speichern
  const orderId = randomUUID()
  await dynamo.send(new PutCommand({
    TableName: 'plexora-orders',
    Item: {
      userId:    event.context.auth?.email || 'guest',
      orderId,
      items:     cartItems,
      status:    'pending',
      email:     body.email || '',
      created:   new Date().toISOString(),
    }
  }))

  // Stripe Checkout Session erstellen
  const origin  = getHeader(event, 'origin') || 'http://localhost:3001'
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items:           lineItems,
    mode:                 'payment',
    success_url:          `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
    cancel_url:           `${origin}/shop/cart`,
    customer_email:       body.email || undefined,
    metadata: {
      orderId,
      userId: event.context.auth?.email || 'guest',
    },
  })

  return { sessionId: session.id, url: session.url }
})
