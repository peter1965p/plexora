import { describe, it, expect, vi } from 'vitest'
import { installGlobals } from '../botprotection/helpers'

let row: any
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ async send() { if (row === 'fail') throw new Error('db'); return { Item: row } } }) }))
installGlobals()
const { default: validate } = await import('../../server/api/licenses/validate.post')
const call = (b: any) => (validate as any)({ body: b, headers: {}, context: {} })
const BASE = { licenseKey: 'PLXR-AAAA-BBBB-CCCC', status: 'active', tier: 'pro', modules: ['crm'], validFrom: '2026-01-01', validUntil: '2099-01-01', customerEmail: 'kunde@lizenz.example', stripeCustomerId: 'cus_X', note: 'intern' }

describe('licenses/validate liefert keine Kundendaten', () => {
  it('gültige Lizenz: nur Schlüssel, Stufe, Module und Gültigkeit – nie E-Mail, Stripe-Kennung oder Notiz', async () => {
    row = { ...BASE }; const r = await call({ licenseKey: 'plxr-aaaa-bbbb-cccc' })
    expect(r).toEqual({ valid: true, licenseKey: BASE.licenseKey, tier: 'pro', modules: ['crm'], validFrom: '2026-01-01', validUntil: '2099-01-01' })
    expect(JSON.stringify(r)).not.toMatch(/kunde@|customerEmail|cus_X|intern|stripe/i)
  })
  it('alle Fehlerzweige enthalten ebenfalls nichts Persönliches', async () => {
    for (const r0 of [undefined, { ...BASE, status: 'cancelled' }, { ...BASE, validUntil: '2000-01-01' }, 'fail'] as any[]) { row = r0; const r = await call({ licenseKey: 'PLXR-X' }); expect(r.valid).toBe(false); expect(JSON.stringify(r)).not.toMatch(/kunde@|customerEmail|cus_X|intern/i) }
  })
})
