import { demoGuard } from '../../utils/demoGuard'
import { requireAdmin } from '../../utils/verifyAuth'
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  demoGuard(body?.userId)
  const client = getDynamoClient()

  // The GET route never returns secrets in plaintext (only *Configured flags),
  // so an empty secret field here means "unchanged", not "clear it" — load the
  // existing item and keep its secret unless a new non-empty value was sent.
  const existing = (await client.send(new GetCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'payment', scope: 'global' },
  }))).Item || {}

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:        'payment',
      scope:            'global',
      activeGateway:    body.activeGateway    || 'stripe',
      // Stripe
      stripeSecretKey:      body.stripeSecretKey      || existing.stripeSecretKey      || '',
      stripePublishableKey: body.stripePublishableKey || '',
      stripeWebhookSecret:  body.stripeWebhookSecret  || existing.stripeWebhookSecret  || '',
      // PayPal
      paypalClientId:    body.paypalClientId    || '',
      paypalSecret:      body.paypalSecret      || existing.paypalSecret      || '',
      paypalSandbox:     body.paypalSandbox     ?? true,
      // Mollie
      mollieApiKey:      body.mollieApiKey      || existing.mollieApiKey      || '',
      // Custom
      customName:        body.customName        || '',
      customApiUrl:      body.customApiUrl      || '',
      customApiKey:      body.customApiKey      || existing.customApiKey      || '',
      updated:           new Date().toISOString(),
    }
  }))

  return { success: true }
})
