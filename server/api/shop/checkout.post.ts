import Stripe from 'stripe'
import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const dynamo = getDynamoClient()
  const config = useRuntimeConfig()

  // Payment Settings laden
  let stripeKey = config.stripeSecretKey as string
  try {
    const ps = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'payment', scope: 'global' }
    }))
    if (ps.Item?.stripeSecretKey) stripeKey = ps.Item.stripeSecretKey
  } catch {}

  const stripe = new Stripe(stripeKey)

  // Produkt aus DynamoDB laden
  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-products',
    FilterExpression: 'productId = :id',
    ExpressionAttributeValues: { ':id': body.productId }
  }))
  const product = scan.Items?.[0]
  if (!product) throw createError({ statusCode: 404, message: 'Produkt nicht gefunden' })

  // Brutto Preis berechnen
  const netto    = Number(product.price) || 0
  const vatRate  = (product.vatRate ?? 19) / 100
  const brutto   = Math.round(netto * (1 + vatRate) * 100) // in Cent

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: body.email || undefined,
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name:        product.name,
          description: product.description || '',
        },
        unit_amount: brutto,
      },
      quantity: body.quantity || 1,
    }],
    success_url: `${body.baseUrl || 'https://plexora.paeffgen-it.de'}/shop/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${body.baseUrl || 'https://plexora.paeffgen-it.de'}/shop`,
    metadata: {
      type:          'shop_purchase',
      productId:     product.productId,
      productName:   product.name,
      productUserId: product.userId || 'demo-user',
      quantity:      String(body.quantity || 1),
    }
  })

  return { url: session.url }
})
