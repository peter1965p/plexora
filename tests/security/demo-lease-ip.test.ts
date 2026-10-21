import { describe, it, expect, vi } from 'vitest'

// Die Drossel des Demo-Starts darf nicht mit einem selbst gesetzten X-Forwarded-For-Eintrag umgangen werden können: gezählt wird die letzte Adresse (die API Gateway anhängt).
const seen: string[] = []; let allow = true
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => Object.assign(new Error(o.message), { statusCode: o.statusCode }))
vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
vi.mock('../../server/utils/rateLimit', async (orig) => ({ ...(await orig() as any), checkRateLimit: async (_b: string, id: string) => { seen.push(id); return allow } }))
vi.mock('../../server/utils/demoSandbox', () => ({ leaseDemoAccount: async () => ({ email: 'demo05@plexora.eu', shared: false }) }))
const { default: lease } = await import('../../server/api/demo/lease.post')
const ev = (xff: string, email = 'demo@plexora.eu') => ({ headers: { 'x-forwarded-for': xff }, context: { auth: { userId: 'u', email, groups: ['customers'] } } })

describe('Demo-Start: Drossel je echter Adresse', () => {
  it('zählt den letzten X-Forwarded-For-Eintrag, nicht den frei wählbaren ersten', async () => {
    seen.length = 0
    await lease(ev('6.6.6.6, 203.0.113.9')); await lease(ev('7.7.7.7, 203.0.113.9')); await lease(ev('203.0.113.9'))
    expect(seen).toEqual(['203.0.113.9', '203.0.113.9', '203.0.113.9'])
  })
  it('zu viele Starts: 429; nur das Ausgangskonto darf vergeben lassen, andere 403', async () => {
    allow = false; await expect(lease(ev('203.0.113.9'))).rejects.toMatchObject({ statusCode: 429 })
    allow = true; await expect(lease(ev('203.0.113.9', 'chef@firma.de'))).rejects.toMatchObject({ statusCode: 403 })
    expect(await lease(ev('203.0.113.9'))).toEqual({ email: 'demo05@plexora.eu', shared: false })
  })
})
