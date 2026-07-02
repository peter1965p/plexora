import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email = getHeader(event, 'x-user-email') || ''
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
      propertiesEnabled: item?.propertiesEnabled ?? false,
      propertiesTitle:   item?.propertiesTitle   || 'Immobilien',
    },
  }
})
