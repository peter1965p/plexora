import Stripe from 'stripe'
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { resolveTenantEmail, resolveUserId } from '../../../../utils/tenant'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*' })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const body      = await readBody(event)
  const dynamo    = getDynamoClient()

  const ownerEmail = await resolveTenantEmail(tenantId)
  if (!ownerEmail) throw createError({ statusCode: 404, message: 'Shop nicht gefunden' })
  const sellerUserId = await resolveUserId(ownerEmail)

  // Produkte des Tenants serverseitig laden — Preise/Verfügbarkeit nie dem Client vertrauen
  const productsRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-products',
    KeyConditionExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': sellerUserId },
  }))
  const productsById = new Map((productsRes.Items || []).map((p: any) => [p.productId, p]))

  const cartItems = Array.isArray(body?.items) ? body.items : []
  const lineItems: any[] = []
  const orderItems: any[] = []

  for (const line of cartItems) {
    const product = productsById.get(line.productId)
    if (!product || product.status !== 'active' || (Number(product.stock) ?? 0) <= 0) continue
    const qty = Math.max(1, Math.min(20, Number(line.quantity) || 1))
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name:        product.name,
          description: product.description || undefined,
          images:      product.image ? [product.image] : undefined,
        },
        unit_amount: Math.round(Number(product.price) * 100),
      },
      quantity: qty,
    })
    orderItems.push({ productId: product.productId, name: product.name, price: Number(product.price), qty })
  }
  if (!lineItems.length) throw createError({ statusCode: 400, message: 'Keine gültigen Produkte im Warenkorb' })

  let stripeKey = useRuntimeConfig().stripeSecretKey as string
  try {
    const ps = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'payment', scope: 'global' } }))
    if (ps.Item?.stripeSecretKey) stripeKey = ps.Item.stripeSecretKey
  } catch {}
  const stripe = new Stripe(stripeKey)

  const buyerUserId = event.context.auth?.email || 'guest'
  const orderId = randomUUID()
  await dynamo.send(new PutCommand({
    TableName: 'plexora-orders',
    Item: {
      userId:       buyerUserId,
      orderId,
      sellerUserId,
      items:        orderItems,
      status:       'pending',
      email:        body.email || '',
      created:      new Date().toISOString(),
    }
  }))

  const origin  = getHeader(event, 'origin') || 'https://nexora.pages.dev'
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items:           lineItems,
    mode:                 'payment',
    success_url:          `${origin}/shop/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`,
    cancel_url:            `${origin}/shop/cart`,
    customer_email:        body.email || undefined,
    metadata: { orderId, userId: buyerUserId, sellerUserId },
  })

  return { sessionId: session.id, url: session.url }
})
