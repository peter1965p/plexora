import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const query  = getQuery(event)
  const userId = await resolveUserId((query.userId as string) || 'demo-user')
  const today  = new Date().toISOString().slice(0, 10)

  const db = getDynamoClient()
  const res = await db.send(new ScanCommand({
    TableName: 'plexora-hr-timelog',
    FilterExpression: 'userId = :u AND #d = :t',
    ExpressionAttributeNames:  { '#d': 'date' },
    ExpressionAttributeValues: { ':u': userId, ':t': today },
  }))

  const entries = (res.Items || []).sort((a: any, b: any) =>
    (b.clockIn || '').localeCompare(a.clockIn || '')
  )
  return { entries, today }
})
