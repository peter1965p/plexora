export interface Contract {
  userId: string
  contractId: string
  title: string
  contractNumber?: string
  type: 'service' | 'license' | 'maintenance' | 'rental' | 'insurance' | 'other'
  companyId?: string
  contactId?: string
  startDate?: string
  endDate?: string
  value?: string
  billingCycle: 'monthly' | 'quarterly' | 'yearly' | 'once'
  autoRenew: boolean
  noticePeriodDays?: number
  status: 'draft' | 'active' | 'cancelled' | 'expired'
  notes?: string
  created: string
}

export function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    service:     'Dienstleistung',
    license:     'Lizenz',
    maintenance: 'Wartung',
    rental:      'Miete',
    insurance:   'Versicherung',
    other:       'Sonstiges',
  }
  return labels[type] || type
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft:     'Entwurf',
    active:    'Aktiv',
    cancelled: 'Gekündigt',
    expired:   'Abgelaufen',
  }
  return labels[status] || status
}

export function statusBadge(status: string): string {
  const badges: Record<string, string> = {
    draft:     'badge-info',
    active:    'badge-success',
    cancelled: 'badge-danger',
    expired:   'badge-warning',
  }
  return badges[status] || 'badge-info'
}

export function billingCycleLabel(cycle: string): string {
  const labels: Record<string, string> = {
    monthly:   '/ Monat',
    quarterly: '/ Quartal',
    yearly:    '/ Jahr',
    once:      'einmalig',
  }
  return labels[cycle] || cycle
}

export function parseEur(val?: string): number {
  if (!val) return 0
  const num = parseFloat(val.replace(/[€.\s]/g, '').replace(',', '.'))
  return isNaN(num) ? 0 : num
}

export function formatEur(val: number): string {
  return '€ ' + val.toLocaleString('de-DE', { maximumFractionDigits: 2 })
}

export function monthlyValue(c: Contract): number {
  const v = parseEur(c.value)
  switch (c.billingCycle) {
    case 'monthly':   return v
    case 'quarterly': return v / 3
    case 'yearly':    return v / 12
    default:          return 0
  }
}

export function calcMrr(contracts: Contract[]): number {
  return contracts
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + monthlyValue(c), 0)
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  const now = new Date()
  d.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

export interface ExpiryInfo { label: string; badge: string }

export function expiryInfo(c: Contract): ExpiryInfo | null {
  if (c.status !== 'active' || !c.endDate) return null
  const days = daysUntil(c.endDate)
  if (days === null) return null
  if (days < 0) return { label: 'Abgelaufen', badge: 'badge-danger' }
  const notice = c.noticePeriodDays || 0
  if (notice > 0 && days <= notice) return { label: `Kündigungsfrist! ${days}d`, badge: 'badge-danger' }
  if (days <= 30) return { label: `läuft in ${days}d aus`, badge: 'badge-warning' }
  return null
}

export function expiringCount(contracts: Contract[]): number {
  return contracts.filter(c => expiryInfo(c) !== null).length
}
