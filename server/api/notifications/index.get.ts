import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { getUserId } from '../../utils/queryByUser'

// plexora-notifications hat den Schlüssel notificationId (Partition) + userId (Sort), daher kein Query nach userId.
export default defineEventHandler(async (event) => {
  const userId = getUserId(event)
  const dynamo = getDynamoClient()
  const items: Record<string, any>[] = []
  let lastKey: Record<string, any> | undefined
  do {
    const res = await dynamo.send(new ScanCommand({
      TableName: 'plexora-notifications',
      FilterExpression: 'userId = :u',
      ExpressionAttributeValues: { ':u': userId },
      ExclusiveStartKey: lastKey,
    }))
    items.push(...(res.Items || []))
    lastKey = res.LastEvaluatedKey
  } while (lastKey)
  items.sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')))
  return { notifications: items.slice(0, 100) }
})
