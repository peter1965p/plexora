import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'

const counters = new Map<string, number>()
let failCounter = false
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input
      if (n === 'UpdateCommand' && i.TableName === 'plexora-newsletter-ratelimit') {
        if (failCounter) throw new Error('DynamoDB down')
        const k = i.Key.throttleKey as string
        counters.set(k, (counters.get(k) || 0) + 1)
        return { Attributes: { count: counters.get(k) } }
      }
      if (n === 'GetCommand' && i.TableName === 'plexora-nexora') return { Item: { tenantId: 'T1', status: 'active' } }
      return {}
    },
  }),
}))
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
const sentHeaders: Record<string, string> = {}
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
vi.stubGlobal('setResponseHeader', (_e: any, n: string, v: string) => { sentHeaders[n] = v })
vi.stubGlobal('setResponseHeaders', () => {})
vi.stubGlobal('getMethod', (e: any) => e.method || 'POST')
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('readBody', async (e: any) => e.body)

const { clientIp, enforcePublicRateLimit, checkRateLimit } = await import('../../server/utils/rateLimit')
const { default: contact } = await import('../../server/api/public/[tenantId]/contact.post')

const ev = (xff: string, extra: any = {}) => ({ headers: { 'x-forwarded-for': xff }, params: { tenantId: 'T1' }, body: { name: 'A B', email: 'a@x.de' }, ...extra })
const code = (p: Promise<any>) => p.then(() => 200, (e: any) => e.statusCode)

beforeEach(() => { counters.clear(); failCounter = false; for (const k of Object.keys(sentHeaders)) delete sentHeaders[k] })
afterEach(() => { vi.useRealTimers() })

describe('Absender-Adresse', () => {
  it('nimmt den LETZTEN X-Forwarded-For-Eintrag (den hängt API Gateway an), nicht den vom Aufrufer gesetzten ersten', () => {
    expect(clientIp(ev('1.1.1.1, 9.9.9.9'))).toBe('9.9.9.9')
    expect(clientIp(ev('9.9.9.9'))).toBe('9.9.9.9')
    expect(clientIp({ headers: {} })).toBe('unknown')
  })
})

describe('Drossel auf öffentlichen Routen', () => {
  it('5 Anfragen pro Minute gehen durch, die 6. bekommt 429 mit verständlicher Meldung und Retry-After', async () => {
    for (let i = 0; i < 5; i++) expect(await code(enforcePublicRateLimit(ev('9.9.9.9')as any, 'r'))).toBe(200)
    const err: any = await enforcePublicRateLimit(ev('9.9.9.9') as any, 'r').catch(e => e)
    expect(err.statusCode).toBe(429)
    expect(err.message).toMatch(/eine Minute/)
    expect(sentHeaders['Retry-After']).toBe('60')
  })
  it('gefälschter erster X-Forwarded-For-Eintrag umgeht die Drossel nicht', async () => {
    for (let i = 0; i < 5; i++) await enforcePublicRateLimit(ev(`10.0.0.${i}, 9.9.9.9`) as any, 'r')
    expect(await code(enforcePublicRateLimit(ev('10.0.0.99, 9.9.9.9') as any, 'r'))).toBe(429)
  })
  it('andere IP und andere Route sind unabhängig', async () => {
    for (let i = 0; i < 5; i++) await enforcePublicRateLimit(ev('9.9.9.9') as any, 'r')
    expect(await code(enforcePublicRateLimit(ev('8.8.8.8') as any, 'r'))).toBe(200)
    expect(await code(enforcePublicRateLimit(ev('9.9.9.9') as any, 'andere'))).toBe(200)
  })
  it('Tageslimit: nach 30 Anfragen über den Tag verteilt ist Schluss, auch wenn die Minute frei ist', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T00:00:10Z'))
    for (let i = 0; i < 30; i++) { await enforcePublicRateLimit(ev('9.9.9.9') as any, 'r'); vi.advanceTimersByTime(61_000) }
    const err: any = await enforcePublicRateLimit(ev('9.9.9.9') as any, 'r').catch(e => e)
    expect(err.statusCode).toBe(429)
    expect(err.message).toMatch(/morgen/)
    expect(sentHeaders['Retry-After']).toBe('3600')
  })
  it('neues Fenster beginnt bei null, ohne dass TTL etwas löschen muss', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T10:00:05Z'))
    for (let i = 0; i < 5; i++) await enforcePublicRateLimit(ev('9.9.9.9') as any, 'r')
    expect(await code(enforcePublicRateLimit(ev('9.9.9.9') as any, 'r'))).toBe(429)
    vi.advanceTimersByTime(60_000)
    expect(await code(enforcePublicRateLimit(ev('9.9.9.9') as any, 'r'))).toBe(200)
  })
  it('fällt der Zähler aus, werden echte Besucher durchgelassen (und der Vorfall geloggt)', async () => {
    failCounter = true
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await checkRateLimit('x', '9.9.9.9', 1, 60)).toBe(true)
    expect(log).toHaveBeenCalled(); log.mockRestore()
  })
})

describe('Einbau', () => {
  it('Kontaktroute: 6. Anfrage in der Minute wird abgewiesen, bevor etwas gespeichert wird', async () => {
    for (let i = 0; i < 5; i++) expect(await code(contact(ev('9.9.9.9') as any))).toBe(200)
    expect(await code(contact(ev('9.9.9.9') as any))).toBe(429)
  })
  it('alle öffentlichen Schreibrouten rufen die Drossel auf', () => {
    for (const f of [
      'server/api/forms/[id]/submit.post.ts', 'server/api/public/[tenantId]/termine/book.post.ts', 'server/api/public/[tenantId]/contact.post.ts',
      'server/api/jobs/[id]/apply.post.ts', 'server/api/public/[tenantId]/orders.post.ts', 'server/api/public/[tenantId]/shop/checkout.post.ts',
      'server/api/support/portal/[token]/comment.post.ts',
    ]) expect(readFileSync(f, 'utf8'), f).toContain('enforcePublicRateLimit(event')
  })
})
