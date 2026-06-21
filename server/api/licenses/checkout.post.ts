import Stripe from 'stripe'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { TIER_MODULES, TIER_LABELS, TIER_PRICES } from '../../utils/license'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { tier, email } = body

  if (!TIER_MODULES[tier]) throw createError({ statusCode: 400, message: 'Ungültiger Tier' })

  const config = useRuntimeConfig()
  const dynamo = getDynamoClient()

  let stripeKey = config.stripeSecretKey as string
  try {
    const ps = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'payment', scope: 'global' }
    }))
    if (ps.Item?.stripeSecretKey) stripeKey = ps.Item.stripeSecretKey
  } catch {}

  const stripe = new Stripe(stripeKey)
  const origin = getHeader(event, 'origin') || 'https://plexora.paeffgen-it.de'

  const session = await stripe.checkout.sessions.create({
    payment_method_types:       ['card'],
    billing_address_collection: 'required',
    mode:                       'payment',
    customer_email:             email || undefined,
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name:        `Plexora ${TIER_LABELS[tier]}`,
          description: `${TIER_MODULES[tier].length} Module freigeschaltet — Lifetime-Lizenz`,
        },
        unit_amount: TIER_PRICES[tier] * 100,
      },
      quantity: 1,
    }],
    success_url: `${origin}/portal?license_success=1`,
    cancel_url:  `${origin}/#pricing`,
    metadata: {
      type:  'license_purchase',
      tier,
      email: email || '',
    },
  })

  return { url: session.url }
})
