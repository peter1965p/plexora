import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const res = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'payment', scope: 'global' }
    }))
    return { payment: res.Item || null }
  } catch {
    return { payment: null }
  }
})
