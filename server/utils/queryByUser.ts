import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { resolveUserId } from './tenant'
import { trackDemoRequest } from './demoTracker'

export async function queryByUser(table: string, userId: string, event?: any) {
  const effectiveId = await resolveUserId(userId)
  // Track once per HTTP request using event.context flag — not once per DB query
  if (effectiveId === 'demo-user') {
    if (event) {
      if (!event.context.__demoTracked) {
        event.context.__demoTracked = true
        trackDemoRequest()
      }
    } else {
      trackDemoRequest()
    }
  }
  const client = getDynamoClient()
  const result = await client.send(new QueryCommand({
    TableName: table,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': effectiveId },
  }))
  return result.Items || []
}

export function getUserId(event: any): string {
  return getQuery(event).userId as string || 'demo-user'
}
