import Stripe from 'stripe'
import { ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { isDemoAccount } from '../../utils/mailGuard'
import { getCatalogEntry, toCents } from '../../utils/storeCatalog'

export default defineEventHandler(async (event) => {
  // Anmeldung ist Pflicht; das öffentlich bekannte Demo-Konto kauft nichts
  const auth = requireAuth(event)
  if (!auth.email || !auth.userId) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  if (isDemoAccount(auth)) throw createError({ statusCode: 403, message: 'Im Demo-Zugang ist der Kauf von Modulen deaktiviert.' })

  // Aus dem Request zählt ausschließlich der Modul-Schlüssel. Name und Preis kommen aus dem Server-Katalog.
  const body = await readBody(event)
  if (!body?.moduleKey) throw createError({ statusCode: 400, message: 'moduleKey erforderlich' })

  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey as string)
  const dynamo = getDynamoClient()
  const origin = getHeader(event, 'origin') || 'https://app.plexora.eu'

  const entry = await getCatalogEntry(body.moduleKey, async (key) =>
    (await dynamo.send(new GetCommand({ TableName: 'plexora-plugin-registry', Key: { key } }))).Item)
  if (!entry) throw createError({ statusCode: 404, message: 'Modul nicht gefunden oder nicht kaufbar' })
  const moduleKey = entry.key
  const name = entry.name

  // E-Mail aus dem verifizierten Token
  const email = auth.email

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
        unit_amount: toCents(entry.priceEur),
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
