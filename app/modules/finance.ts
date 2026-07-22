export interface Invoice {
  userId: string
  invoiceId: string
  number: string
  client: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  dueDate: string
  created: string
}

export function calcRevenue(invoices: Invoice[]): number {
  return invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.amount, 0)
}

export function calcPending(invoices: Invoice[]): number {
  return invoices
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + i.amount, 0)
}

export function calcOverdue(invoices: Invoice[]): number {
  return invoices
    .filter(i => i.status === 'overdue')
    .reduce((sum, i) => sum + i.amount, 0)
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid:      'Bezahlt',
    pending:   'Ausstehend',
    overdue:   'Überfällig',
    dunning_1: '1. Mahnung',
    dunning_2: '2. Mahnung',
    dunning_3: '3. Mahnung',
  }
  return labels[status] || status
}

export function statusBadge(status: string): string {
  const badges: Record<string, string> = {
    paid:      'badge-success',
    pending:   'badge-warning',
    overdue:   'badge-danger',
    dunning_1: 'badge-danger',
    dunning_2: 'badge-danger',
    dunning_3: 'badge-danger',
  }
  return badges[status] || 'badge-info'
}

export const STATUS_OPTIONS = [
  { value: 'pending',   label: 'Ausstehend' },
  { value: 'overdue',   label: 'Überfällig' },
  { value: 'paid',      label: 'Bezahlt' },
  { value: 'dunning_1', label: '1. Mahnung' },
  { value: 'dunning_2', label: '2. Mahnung' },
  { value: 'dunning_3', label: '3. Mahnung' },
]

export function formatEur(val: number): string {
  return '€ ' + val.toLocaleString('de-DE')
}
