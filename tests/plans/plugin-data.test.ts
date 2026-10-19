import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { isPluginKey, MAX_PLUGIN_DATA_BYTES } from '../../shared/pluginData'

const rows = new Map<string, any>()
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input
  if (c === 'ScanCommand') return { Items: [] }
  if (c === 'PutCommand') { rows.set(`${i.Item.tenantId}|${i.Item.pluginKey}`, i.Item); return {} }
  if (c === 'GetCommand') return { Item: rows.get(`${i.Key.tenantId}|${i.Key.pluginKey}`) }
  return {}
} }) }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
let GET: any, POST: any
beforeAll(async () => {
  GET = (await import('../../server/api/plugins/[key]/data.get')).default
  POST = (await import('../../server/api/plugins/[key]/data.post')).default
})
beforeEach(() => rows.clear())
const ev = (email: string, key: string, body?: any, groups: string[] = ['customers']) => ({ context: { auth: { userId: 'u', email, groups } }, params: { key }, body, headers: {} })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number } } }

describe('Plugin-Daten', () => {
  it('Schlüssel: nur a-z, 0-9, Bindestrich', () => {
    expect(isPluginKey('mein-modul')).toBe(true)
    for (const k of ['', 'A', '-x', 'a b', 'a/b', 'x'.repeat(41), undefined, 5]) expect(isPluginKey(k), String(k)).toBe(false)
  })
  it('speichert und liest je Mandant, getrennt nach Plugin', async () => {
    expect((await call(POST, ev('chef@firma.de', 'liste', { data: { a: 1 } }))).code).toBe(200)
    expect((await call(GET, ev('chef@firma.de', 'liste'))).res).toEqual({ data: { a: 1 } })
    expect((await call(GET, ev('chef@firma.de', 'andere'))).res).toEqual({ data: null })
    expect((await call(GET, ev('fremd@firma.de', 'liste'))).res).toEqual({ data: null })
  })
  it('Demo-Konto darf nicht schreiben, ungültiger Schlüssel und zu große Daten werden abgelehnt', async () => {
    expect((await call(POST, ev('demo@plexora.eu', 'liste', { data: 1 }, ['demo']))).code).toBe(403)
    expect(rows.size).toBe(0)
    expect((await call(POST, ev('chef@firma.de', 'Bad Key', { data: 1 }))).code).toBe(400)
    expect((await call(GET, ev('chef@firma.de', '../x'))).code).toBe(400)
    expect((await call(POST, ev('chef@firma.de', 'liste', { data: 'x'.repeat(MAX_PLUGIN_DATA_BYTES + 1) }))).code).toBe(413)
    expect(rows.size).toBe(0)
  })
})
