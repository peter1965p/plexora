import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const userId = getQuery(event).userId as string || 'demo-user'
  const dynamo = getDynamoClient()
  try {
    const res = await dynamo.send(new ScanCommand({
      TableName: 'plexora-notifications',
      FilterExpression: 'userId = :uid AND #r = :r',
      ExpressionAttributeNames: { '#r': 'read' },
      ExpressionAttributeValues: { ':uid': userId, ':r': false }
    }))
    return { notifications: res.Items || [] }
  } catch {
    return { notifications: [] }
  }
})
