export interface Ticket {
  userId: string
  ticketId: string
  title: string
  client: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  created: string
  updated: string
}

export function priorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low:      'Niedrig',
    medium:   'Mittel',
    high:     'Hoch',
    critical: 'Kritisch',
  }
  return labels[priority] || priority
}

export function priorityBadge(priority: string): string {
  const badges: Record<string, string> = {
    low:      'badge-info',
    medium:   'badge-warning',
    high:     'badge-danger',
    critical: 'badge-danger',
  }
  return badges[priority] || 'badge-info'
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    open:        'Offen',
    in_progress: 'In Bearbeitung',
    resolved:    'Gelöst',
    closed:      'Geschlossen',
  }
  return labels[status] || status
}

export function calcOpenTickets(tickets: Ticket[]): number {
  return tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
}
