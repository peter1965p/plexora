export interface Company {
  userId: string
  companyId: string
  name: string
  website?: string
  branche?: string
  email?: string
  phone?: string
  street?: string
  zip?: string
  city?: string
  country?: string
  notes?: string
  created: string
}

export function companyAddress(c: Company): string {
  const line2 = [c.zip, c.city].filter(Boolean).join(' ')
  return [c.street, line2, c.country].filter(Boolean).join(', ')
}
