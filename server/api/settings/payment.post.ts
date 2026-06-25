import { demoGuard } from '../../utils/demoGuard'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { demoGuard } from '../../utils/demoGuard'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  demoGuard(body?.userId)
  const client = getDynamoClient()

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:        'payment',
      scope:            'global',
      activeGateway:    body.activeGateway    || 'stripe',
      // Stripe
      stripeSecretKey:      body.stripeSecretKey      || '',
      stripePublishableKey: body.stripePublishableKey || '',
      stripeWebhookSecret:  body.stripeWebhookSecret  || '',
      // PayPal
      paypalClientId:    body.paypalClientId    || '',
      paypalSecret:      body.paypalSecret      || '',
      paypalSandbox:     body.paypalSandbox     ?? true,
      // Mollie
      mollieApiKey:      body.mollieApiKey      || '',
      // Custom
      customName:        body.customName        || '',
      customApiUrl:      body.customApiUrl      || '',
      customApiKey:      body.customApiKey      || '',
      updated:           new Date().toISOString(),
    }
  }))

  return { success: true }
})
