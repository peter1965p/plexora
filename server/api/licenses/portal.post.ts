import Stripe from 'stripe'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const config = useRuntimeConfig()
  const dynamo = getDynamoClient()

  let stripeKey = config.stripeSecretKey as string
  try {
    const ps = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'payment', scope: 'global' } }))
    if (ps.Item?.stripeSecretKey) stripeKey = ps.Item.stripeSecretKey
  } catch {}

  const stripe = new Stripe(stripeKey)
  const origin = getHeader(event, 'origin') || 'https://app.plexora.eu'

  const customers = await stripe.customers.list({ email, limit: 1 })
  if (!customers.data.length) throw createError({ statusCode: 404, message: 'Kein Stripe-Kunde gefunden' })

  const session = await stripe.billingPortal.sessions.create({
    customer:   customers.data[0].id,
    return_url: `${origin}/dashboard`,
  })

  return { url: session.url }
})
