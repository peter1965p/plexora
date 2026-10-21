import { DEFAULT_WALL } from '../../shared/landingWall'
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const store = new Map<string, any>(); let fail = false
const db = { async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input
  if (fail) throw new Error('db down')
  if (c === 'GetCommand') return { Item: store.get(`${i.Key.settingId}|${i.Key.scope}`) }
  if (c === 'UpdateCommand') { const k = `${i.Key.settingId}|${i.Key.scope}`; store.set(k, { ...(store.get(k) || {}), theme: i.ExpressionAttributeValues[':t'], updated: i.ExpressionAttributeValues[':u'] }); return {} }
  return {}
} }
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => db }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('setResponseHeaders', () => {})
const H: Record<string, any> = {}
beforeAll(async () => { H.pub = (await import('../../server/api/public/landing-theme.get')).default; H.get = (await import('../../server/api/settings/landing-theme.get')).default; H.post = (await import('../../server/api/settings/landing-theme.post')).default })
beforeEach(() => { store.clear(); fail = false })
const ev = (groups: string[] | null, body?: any) => ({ context: { auth: groups ? { userId: 'u', email: 'x@y.de', groups } : undefined }, body })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number } } }

describe('Startseiten-Design: Routen', () => {
  it('ohne Speicherung liefert die öffentliche Route das freundliche helle Standarddesign; bei Datenbankfehler ebenso', async () => {
    expect((await H.pub(ev(null))).theme.mode).toBe('light')
    fail = true; expect((await H.pub(ev(null))).theme.mode).toBe('light')
  })
  it('Speichern nur für Betreiber (Gruppe admins): anonym 401, Kunde 403, Betreiber 200', async () => {
    const body = { mode: 'custom', bg: '#000000', bgOpacity: 75, accent: '#1e3a8a', text: '', display: { on: true, bg: '#000000', bgOpacity: 70, fg: '#2f7bff' }, wall: DEFAULT_WALL }
    expect((await call(H.post, ev(null, body))).code).toBe(401)
    expect((await call(H.post, ev(['customers'], body))).code).toBe(403)
    expect((await call(H.get, ev(['customers']))).code).toBe(403)
    expect((await call(H.post, ev(['admins'], body))).code).toBe(200)
    expect((await H.pub(ev(null))).theme).toEqual(body)
    expect((await H.get(ev(['admins']))).theme).toEqual(body)
  })
  it('gespeichert wird nur die geprüfte Form: kein Roh-Body, keine Fremdfelder, kein Code in Farben', async () => {
    await H.post(ev(['admins'], { mode: 'custom', bg: 'red; background:url(//evil)', bgOpacity: 9999, accent: '#ABCDEF', text: '</style><script>', extra: 'x', __proto__: { a: 1 } }))
    const saved = store.get('landing-theme|global').theme
    expect(saved).toEqual({ mode: 'custom', bg: '#000000', bgOpacity: 100, accent: '#abcdef', text: '', display: { on: true, bg: '#000000', bgOpacity: 70, fg: '#2f7bff' }, wall: DEFAULT_WALL })
    expect(Object.keys(saved).sort()).toEqual(['accent', 'bg', 'bgOpacity', 'display', 'mode', 'text', 'wall'])
  })
  it('Kennzahlen-Display: eigene Werte werden geprüft gespeichert und öffentlich geliefert', async () => {
    const body = { mode: 'light', display: { on: false, bg: '#102030', bgOpacity: 400, fg: 'javascript:1', evil: 'x' } }
    expect((await call(H.post, ev(['admins'], body))).code).toBe(200)
    expect((await H.pub(ev(null))).theme.display).toEqual({ on: false, bg: '#102030', bgOpacity: 100, fg: '#2f7bff' })
  })
  it('die öffentliche Route gibt nie Fremdfelder aus der Datenbank heraus', async () => {
    store.set('landing-theme|global', { theme: { mode: 'dark', bg: '#111111', bgOpacity: 50, accent: '#222222', text: '', geheim: 'x' }, intern: 'y' })
    expect(Object.keys((await H.pub(ev(null))).theme).sort()).toEqual(['accent', 'bg', 'bgOpacity', 'display', 'mode', 'text', 'wall'])
  })
})
