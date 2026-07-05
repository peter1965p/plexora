import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = event.context.auth?.email || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body   = await readBody(event)
  const dynamo = getDynamoClient()

  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  const item = res.Items?.[0]
  if (!item) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-nexora',
    Key: { tenantId: item.tenantId },
    UpdateExpression: 'SET mobileDeApiKey = :m, autoscout24ApiKey = :a, vehiclesEnabled = :ve, vehiclesTitle = :vt, updatedAt = :u',
    ExpressionAttributeValues: {
      ':m':  body.mobileDeApiKey    || '',
      ':a':  body.autoscout24ApiKey || '',
      ':ve': body.vehiclesEnabled   ?? false,
      ':vt': body.vehiclesTitle     || 'Fahrzeuge',
      ':u':  new Date().toISOString(),
    },
  }))

  return { success: true }
})
