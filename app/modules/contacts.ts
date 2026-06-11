export interface Contact {
  userId: string
  contactId: string
  firstName: string
  lastName: string
  email: string
  company: string
  phone?: string
  status: 'lead' | 'customer' | 'churned'
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
