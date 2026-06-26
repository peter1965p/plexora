import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const TABLE   = 'plexora-meta'
const METRICS = ['LCP', 'INP', 'CLS', 'FCP', 'TTFB']

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name, value, rating } = body || {}

  if (!name || value === undefined || !METRICS.includes(name)) return { ok: true }

  const today     = new Date().toISOString().slice(0, 10)
  const client    = getDynamoClient()
  const metricKey = name.toLowerCase()
  const ratingKey = rating === 'needs-improvement' ? 'needs' : (rating || 'poor')
  const rounded   = Math.round(Number(value) * 100) / 100

  // Step 1: ensure metric map exists in day item
  await client.send(new UpdateCommand({
    TableName: TABLE,
    Key: { pk: `vitals-day-${today}` },
    UpdateExpression: 'SET #d = if_not_exists(#d, :d), #m = if_not_exists(#m, :init)',
    ExpressionAttributeNames: { '#d': 'date', '#m': metricKey },
    ExpressionAttributeValues: { ':d': today, ':init': { count: 0, sum: 0, good: 0, needs: 0, poor: 0 } },
  })).catch(() => {})

  // Step 2: atomic increment — count, sum, and the rating bucket
  await client.send(new UpdateCommand({
    TableName: TABLE,
    Key: { pk: `vitals-day-${today}` },
    UpdateExpression: 'ADD #m.#cnt :one, #m.#sum :val, #m.#rat :one',
    ExpressionAttributeNames: { '#m': metricKey, '#cnt': 'count', '#sum': 'sum', '#rat': ratingKey },
    ExpressionAttributeValues: { ':one': 1, ':val': rounded },
  })).catch(() => {})

  return { ok: true }
})
