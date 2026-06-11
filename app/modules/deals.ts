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

export function calcTotalValue(deals: Deal[]): number {
  return deals.reduce((sum, d) => {
    const num = parseFloat(d.value.replace(/[€.\s]/g, '').replace(',', '.'))
    return sum + (isNaN(num) ? 0 : num)
  }, 0)
}

export function calcWinRate(deals: Deal[]): number {
  if (!deals.length) return 0
  const won = deals.filter(d => d.status === 'success').length
  return Math.round((won / deals.length) * 100)
}

export function calcWeightedPipeline(deals: Deal[]): number {
  return deals.reduce((sum, d) => {
    const num = parseFloat(d.value.replace(/[€.\s]/g, '').replace(',', '.'))
    return sum + (isNaN(num) ? 0 : num * d.prob / 100)
  }, 0)
}

export function formatEur(val: number): string {
  return '€ ' + val.toLocaleString('de-DE')
}
