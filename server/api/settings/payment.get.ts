import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const res = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'payment', scope: 'global' }
    }))
    const item = res.Item
    if (!item) return { payment: null }

    // Secrets are never returned in plaintext — only whether one is configured.
    return {
      payment: {
        activeGateway:                 item.activeGateway        || 'stripe',
        stripeSecretKeyConfigured:     !!item.stripeSecretKey,
        stripePublishableKey:          item.stripePublishableKey || '',
        stripeWebhookSecretConfigured: !!item.stripeWebhookSecret,
        paypalClientId:                item.paypalClientId      || '',
        paypalSecretConfigured:        !!item.paypalSecret,
        paypalSandbox:                 item.paypalSandbox       ?? true,
        mollieApiKeyConfigured:        !!item.mollieApiKey,
        customName:                    item.customName          || '',
        customApiUrl:                  item.customApiUrl        || '',
        customApiKeyConfigured:        !!item.customApiKey,
        updated:                       item.updated,
      }
    }
  } catch {
    return { payment: null }
  }
})
