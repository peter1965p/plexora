import { describe, it, expect, vi } from 'vitest'

// Besucherstatistik: die IP kommt von Cloudflare (cf-connecting-ip) oder, ohne die, vom LETZTEN X-Forwarded-For-Eintrag (den hängt API Gateway an). Der erste Eintrag ist frei wählbar und zählt nicht.
const tracked: any[] = []
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('getMethod', (e: any) => e.method)
vi.stubGlobal('getRequestURL', (e: any) => ({ pathname: e.path }))
vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
vi.mock('../../server/utils/analyticsTracker', () => ({ trackVisit: (v: any) => { tracked.push(v) } }))
const { default: mw } = await import('../../server/middleware/analytics')
const visit = (headers: Record<string, string>) => { tracked.length = 0; mw({ path: '/', method: 'GET', headers: { 'user-agent': 'Mozilla/5.0', ...headers } } as any); return tracked[0]?.ip }

describe('Besucherstatistik: Absender-Adresse', () => {
  it('Cloudflare-Adresse hat Vorrang; sonst der letzte Eintrag, nie der frei wählbare erste', () => {
    expect(visit({ 'cf-connecting-ip': '198.51.100.7', 'x-forwarded-for': '6.6.6.6, 203.0.113.9' })).toBe('198.51.100.7')
    expect(visit({ 'x-forwarded-for': '6.6.6.6, 7.7.7.7, 203.0.113.9' })).toBe('203.0.113.9')
    expect(visit({ 'x-forwarded-for': '203.0.113.9' })).toBe('203.0.113.9')
  })
  it('ohne Angaben: leer (kein "unknown" in der Statistik)', () => { expect(visit({})).toBe('') })
})
