import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { resolveUserId } from './tenant'

export async function queryByUser(table: string, userId: string) {
  const effectiveId = await resolveUserId(userId)
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
