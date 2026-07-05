import Stripe from 'stripe'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey as string)
  const dynamo = getDynamoClient()
  const origin = getHeader(event, 'origin') || 'https://app.plexora.eu'

  const { email } = requireAuth(event)

  // Stripe Customer ID aus Lizenz holen
  let customerId: string | undefined
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

  if (!customerId) throw createError({ statusCode: 404, message: 'Kein Stripe-Kunde gefunden' })

  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${origin}/settings?tab=billing`,
  })

  return { url: session.url }
})
