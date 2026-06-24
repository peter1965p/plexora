import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

export async function queryByUser(table: string, userId: string) {
  const client = getDynamoClient()
  const result = await client.send(new QueryCommand({
    TableName: table,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }))
  return result.Items || []
}

export function getUserId(event: any): string {
  return getQuery(event).userId as string || 'demo-user'
}
