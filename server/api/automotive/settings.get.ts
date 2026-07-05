import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  const item = res.Items?.[0]
  return {
    settings: {
      mobileDeApiKey:     item?.mobileDeApiKey     || '',
      autoscout24ApiKey:  item?.autoscout24ApiKey  || '',
      vehiclesEnabled:    item?.vehiclesEnabled    ?? false,
      vehiclesTitle:      item?.vehiclesTitle      || 'Fahrzeuge',
    },
  }
})
