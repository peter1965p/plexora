export interface Deal {
  userId: string
  dealId: string
  name: string
  value: string
  stage: string
  prob: number
  status: 'success' | 'warning' | 'info' | 'danger'
  created: string
}

export const stageLabel: Record<string, string> = {
  success: 'Gewonnen',
  warning: 'Verhandlung',
  info:    'In Arbeit',
  danger:  'Verloren',
}

function parseValue(v: any): number {
  if (typeof v === 'number') return v
  if (!v) return 0
  return parseFloat(String(v).replace(/[€.\s]/g, '').replace(',', '.')) || 0
}

export function calcTotalValue(deals: Deal[]): number {
  return deals.reduce((sum, d) => sum + parseValue(d.value), 0)
}

export function calcWinRate(deals: Deal[]): number {
  if (!deals.length) return 0
  const won = deals.filter(d => d.status === 'success').length
  return Math.round((won / deals.length) * 100)
}

export function calcWeightedPipeline(deals: Deal[]): number {
  return deals.reduce((sum, d) => {
    const num = parseValue(d.value)
    return sum + num * ((d.prob ?? (d as any).probability ?? 0) / 100)
  }, 0)
}

export function formatEur(val: number): string {
  return '€ ' + val.toLocaleString('de-DE')
}
