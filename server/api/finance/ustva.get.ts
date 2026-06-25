import { queryByUser, getUserId } from '../../utils/queryByUser'

interface Period {
  label: string
  netto: number
  ust: number
  brutto: number
  invoiceCount: number
}

export default defineEventHandler(async (event) => {
  const query    = getQuery(event)
  const items    = await queryByUser('plexora-finance', getUserId(event))
  const year     = query.year ? Number(query.year) : new Date().getFullYear()
  const mode     = (query.mode as string) || 'quarterly' // 'quarterly' | 'monthly'

  const paid = (items as any[]).filter(i => {
    if (i.status !== 'paid') return false
    const d = new Date(i.created || i.dueDate || '')
    return d.getFullYear() === year
  })

  const buckets: Record<string, Period> = {}

  const label = (d: Date) => mode === 'monthly'
    ? `${String(d.getMonth() + 1).padStart(2, '0')}/${year}`
    : `Q${Math.ceil((d.getMonth() + 1) / 3)}/${year}`

  for (const inv of paid) {
    const d   = new Date(inv.created || inv.dueDate || '')
    const key = label(d)
    if (!buckets[key]) buckets[key] = { label: key, netto: 0, ust: 0, brutto: 0, invoiceCount: 0 }
    const n = Number(inv.amount) || 0
    buckets[key].netto        += n
    buckets[key].ust          += Math.round(n * 0.19 * 100) / 100
    buckets[key].brutto       += Math.round(n * 1.19 * 100) / 100
    buckets[key].invoiceCount += 1
  }

  // Round all
  const periods = Object.values(buckets).map(p => ({
    ...p,
    netto:   Math.round(p.netto * 100) / 100,
    ust:     Math.round(p.ust * 100) / 100,
    brutto:  Math.round(p.brutto * 100) / 100,
  }))

  const totalNetto  = Math.round(periods.reduce((s, p) => s + p.netto,  0) * 100) / 100
  const totalUst    = Math.round(periods.reduce((s, p) => s + p.ust,    0) * 100) / 100
  const totalBrutto = Math.round(periods.reduce((s, p) => s + p.brutto, 0) * 100) / 100

  // EÜR: only from cashbook expenses (Betriebsausgaben) — we return the summary here
  // Expenses handled separately via cashbook; here we just return Einnahmen
  return {
    year,
    mode,
    periods,
    totals: { netto: totalNetto, ust: totalUst, brutto: totalBrutto },
    kennzahlen: {
      kz41: totalNetto.toFixed(2),  // Umsätze 19% (Bemessungsgrundlage)
      kz81: totalUst.toFixed(2),    // Umsatzsteuer 19%
    },
  }
})
