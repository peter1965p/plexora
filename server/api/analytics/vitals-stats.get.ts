import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

const TABLE   = 'plexora-meta'
const METRICS = ['lcp', 'inp', 'cls', 'fcp', 'ttfb']

// Good/Poor thresholds (ms for time metrics, score for CLS)
const THRESHOLDS: Record<string, { good: number; poor: number; unit: string }> = {
  lcp:  { good: 2500,  poor: 4000,  unit: 'ms' },
  inp:  { good: 200,   poor: 500,   unit: 'ms' },
  cls:  { good: 0.1,   poor: 0.25,  unit: ''   },
  fcp:  { good: 1800,  poor: 3000,  unit: 'ms' },
  ttfb: { good: 800,   poor: 1800,  unit: 'ms' },
}

export default defineEventHandler(async (event) => {
  requireAuth(event)
  const client = getDynamoClient()
  const res    = await client.send(new ScanCommand({ TableName: TABLE }))
  const items  = (res.Items || []).filter(i =>
    typeof i.pk === 'string' && i.pk.startsWith('vitals-day-')
  )

  // Aggregate across all days
  const totals: Record<string, { count: number; sum: number; good: number; needs: number; poor: number }> = {}
  for (const m of METRICS) totals[m] = { count: 0, sum: 0, good: 0, needs: 0, poor: 0 }

  for (const item of items) {
    for (const m of METRICS) {
      const d = item[m]
      if (!d) continue
      totals[m].count += d.count || 0
      totals[m].sum   += d.sum   || 0
      totals[m].good  += d.good  || 0
      totals[m].needs += d.needs || 0
      totals[m].poor  += d.poor  || 0
    }
  }

  // Last 7 days per metric
  const today  = new Date().toISOString().slice(0, 10)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })

  const trend: Record<string, { date: string; avg: number; count: number }[]> = {}
  for (const m of METRICS) {
    trend[m] = last7Days.map(date => {
      const item = items.find(i => i.pk === `vitals-day-${date}`)
      const d    = item?.[m]
      const count = d?.count || 0
      const avg   = count > 0 ? Math.round((d.sum / count) * 10) / 10 : 0
      return { date, avg, count }
    })
  }

  // Build result
  const result: Record<string, any> = {}
  for (const m of METRICS) {
    const t     = totals[m]
    const avg   = t.count > 0 ? Math.round((t.sum / t.count) * 10) / 10 : 0
    const total = t.count
    result[m] = {
      avg,
      count: total,
      goodPct:  total > 0 ? Math.round((t.good  / total) * 100) : 0,
      needsPct: total > 0 ? Math.round((t.needs / total) * 100) : 0,
      poorPct:  total > 0 ? Math.round((t.poor  / total) * 100) : 0,
      trend: trend[m],
      ...THRESHOLDS[m],
    }
  }

  return result
})
