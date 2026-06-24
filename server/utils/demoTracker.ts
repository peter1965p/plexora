import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

const TABLE = 'plexora-meta'

export function trackDemoRequest(): void {
  const today = new Date().toISOString().slice(0, 10)
  const client = getDynamoClient()

  client.send(new UpdateCommand({
    TableName: TABLE,
    Key: { pk: 'demo-total' },
    UpdateExpression: 'ADD #c :one',
    ExpressionAttributeNames: { '#c': 'count' },
    ExpressionAttributeValues: { ':one': 1 },
  })).catch(() => {})

  client.send(new UpdateCommand({
    TableName: TABLE,
    Key: { pk: `demo-day-${today}` },
    UpdateExpression: 'ADD #c :one SET #d = :d',
    ExpressionAttributeNames: { '#c': 'count', '#d': 'date' },
    ExpressionAttributeValues: { ':one': 1, ':d': today },
  })).catch(() => {})
}

export async function getDemoStats() {
  const client = getDynamoClient()
  const today = new Date().toISOString().slice(0, 10)
  const monthPrefix = today.slice(0, 7)

  const res = await client.send(new ScanCommand({ TableName: TABLE }))
  const items = res.Items || []

  const total = items.find(i => i.pk === 'demo-total')?.count || 0
  const todayCount = items.find(i => i.pk === `demo-day-${today}`)?.count || 0
  const monthCount = items
    .filter(i => typeof i.pk === 'string' && i.pk.startsWith(`demo-day-${monthPrefix}`))
    .reduce((s: number, i: any) => s + (i.count || 0), 0)

  const last7 = Array.from({ length: 7 }, (_, offset) => {
    const d = new Date(); d.setDate(d.getDate() - offset)
    const key = `demo-day-${d.toISOString().slice(0, 10)}`
    return {
      date: d.toISOString().slice(0, 10),
      count: items.find(i => i.pk === key)?.count || 0,
    }
  }).reverse()

  return { total, today: todayCount, month: monthCount, last7 }
}
