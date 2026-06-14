export interface Contact {
  userId: string
  contactId: string
  firstName: string
  lastName: string
  email: string
  company: string
  companyId?: string
  phone?: string
  status: 'lead' | 'customer' | 'churned'
  leadSource?: string
  leadStatus?: 'new' | 'contacted' | 'qualified' | 'unqualified'
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
  landingPageId?: string
  score?: number
  customerId?: string
  convertedAt?: string
  accessCount?: number
  lastAccessedAt?: string
  created: string
}

export function fullName(c: Contact): string {
  return `${c.firstName} ${c.lastName}`
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    lead:     'Lead',
    customer: 'Kunde',
    churned:  'Verloren',
  }
  return labels[status] || status
}

export function statusBadge(status: string): string {
  const badges: Record<string, string> = {
    lead:     'badge-info',
    customer: 'badge-success',
    churned:  'badge-danger',
  }
  return badges[status] || 'badge-info'
}

export function leadSourceLabel(source?: string): string {
  const labels: Record<string, string> = {
    manual:       'Manuell',
    'csv-import': 'CSV/Excel-Import',
    landingpage:  'Landingpage',
    referral:     'Empfehlung',
    other:        'Sonstiges',
  }
  return labels[source || ''] || source || '—'
}

export function leadStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    new:         'Neu',
    contacted:   'Kontaktiert',
    qualified:   'Qualifiziert',
    unqualified: 'Unqualifiziert',
  }
  return labels[status || ''] || '—'
}

export function leadStatusBadge(status?: string): string {
  const badges: Record<string, string> = {
    new:         'badge-info',
    contacted:   'badge-warning',
    qualified:   'badge-success',
    unqualified: 'badge-danger',
  }
  return badges[status || ''] || 'badge-info'
}

export function sortByMostUsed(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    const countDiff = (b.accessCount || 0) - (a.accessCount || 0)
    if (countDiff !== 0) return countDiff
    const aTime = a.lastAccessedAt || a.created
    const bTime = b.lastAccessedAt || b.created
    return new Date(bTime).getTime() - new Date(aTime).getTime()
  })
}
