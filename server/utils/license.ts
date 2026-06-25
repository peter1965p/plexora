import { randomUUID } from 'crypto'

export const TIER_MODULES: Record<string, string[]> = {
  starter:    ['crm', 'support'],
  pro:        ['crm', 'support', 'finance', 'projects', 'contracts', 'hr', 'analytics', 'shop', 'forms'],
  enterprise: ['crm', 'support', 'finance', 'projects', 'contracts', 'hr', 'analytics', 'shop', 'forms', 'marketing'],
}

export const TIER_LABELS: Record<string, string> = {
  starter:    'Starter',
  pro:        'Pro',
  enterprise: 'Enterprise',
}

export const TIER_PRICES: Record<string, number> = {
  starter:    49,
  pro:        149,
  enterprise: 299,
}

export function generateLicenseKey(): string {
  const uuid = randomUUID().replace(/-/g, '').toUpperCase()
  return `PLXR-${uuid.slice(0,4)}-${uuid.slice(4,8)}-${uuid.slice(8,12)}-${uuid.slice(12,16)}`
}

export function isLicenseExpired(validUntil: string | null | undefined): boolean {
  if (!validUntil) return false
  return new Date(validUntil) < new Date()
}
