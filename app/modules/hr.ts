export interface Employee {
  userId: string
  employeeId: string
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  status: 'active' | 'vacation' | 'sick' | 'offboarding'
  startDate: string
  created: string
}

export function fullName(e: Employee): string {
  return `${e.firstName} ${e.lastName}`
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active:      'Aktiv',
    vacation:    'Urlaub',
    sick:        'Krank',
    offboarding: 'Offboarding',
  }
  return labels[status] || status
}

export function statusBadge(status: string): string {
  const badges: Record<string, string> = {
    active:      'badge-success',
    vacation:    'badge-info',
    sick:        'badge-warning',
    offboarding: 'badge-danger',
  }
  return badges[status] || 'badge-info'
}

export function calcHeadcount(employees: Employee[]): number {
  return employees.filter(e => e.status === 'active').length
}
