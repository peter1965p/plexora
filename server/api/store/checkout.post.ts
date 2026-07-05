import Stripe from 'stripe'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const { moduleKey, name, priceEur } = await readBody(event)
  if (!moduleKey || !name || !priceEur) throw createError({ statusCode: 400, message: 'moduleKey, name, priceEur erforderlich' })

  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey as string)
  const dynamo = getDynamoClient()
  const origin = getHeader(event, 'origin') || 'https://app.plexora.eu'

  // Email aus Auth-Header lesen
  const email = event.context.auth?.email || ''

  // Stripes Customer ID aus bestehender Lizenz holen
  let customerId: string | undefined
  if (email) {
    try {
      const scan = await dynamo.send(new ScanCommand({
        TableName: 'plexora-licenses',
        FilterExpression: 'customerEmail = :e AND #st = :active',
        ExpressionAttributeNames: { '#st': 'status' },
        ExpressionAttributeValues: { ':e': email, ':active': 'active' }
      }))
      const license = scan.Items?.[0]
      if (license?.stripeCustomerId) customerId = license.stripeCustomerId
    } catch {}

    // Fallback: Stripe-Kunden per E-Mail suchen
    if (!customerId) {
      try {
        const customers = await stripe.customers.list({ email, limit: 1 })
        if (customers.data.length > 0) customerId = customers.data[0].id
      } catch {}
    }
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: customerId,
    customer_email: !customerId ? (email || undefined) : undefined,
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: { name: `Plexora — ${name}` },
        unit_amount: Math.round(priceEur * 100),
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    success_url: `${origin}/store?success=1&module=${moduleKey}`,
    cancel_url:  `${origin}/store`,
    metadata: {
      type:       'module_purchase',
      moduleKey,
      moduleName: name,
      email,
    },
  })

  return { url: session.url }
})
