import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email  = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const dynamo = getDynamoClient()
  const res    = await dynamo.send(new ScanCommand({
    TableName:        'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))

  const item = res.Items?.[0]
  if (!item) return { nexora: null }

  return {
    nexora: {
      tenantId:     item.tenantId,
      apiKey:       item.apiKey,
      companyName:  item.companyName  || '',
      subdomain:    item.subdomain    || '',
      customDomain: item.customDomain || '',
      status:       item.status,
      config:       item.config       || {},
      createdAt:    item.createdAt,
    }
  }
})
