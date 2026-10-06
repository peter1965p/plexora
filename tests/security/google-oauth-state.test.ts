import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installGlobals } from '../botprotection/helpers'

const db = { nexora: [{ tenantId: 'T-CHEF', email: 'chef@firma.de' }], updates: [] as any[] }
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input
      if (n === 'ScanCommand') return { Items: db.nexora.filter(x => x.email === i.ExpressionAttributeValues[':e']) }
      if (n === 'UpdateCommand') { db.updates.push(i); return {} }
      return {}
    },
  }),
}))
vi.mock('../../server/utils/verifyAuth', () => ({ verifyToken: async (t: string) => (t === 'tok-chef' ? { userId: 'sub-chef', email: 'chef@firma.de', groups: [] } : null) }))
installGlobals()
const cookies = new Map<string, string>()
const redirects: string[] = []
const googleCalls: string[] = []
vi.stubGlobal('useRuntimeConfig', () => ({ encryptionKey: Buffer.alloc(32, 7).toString('base64'), googleClientId: 'cid', googleClientSecret: 'csec', public: { apiBase: 'https://api.example' } }))
vi.stubGlobal('setCookie', (_e: any, n: string, v: string) => { cookies.set(n, v) })
vi.stubGlobal('getCookie', (e: any, n: string) => e.cookies?.[n])
vi.stubGlobal('deleteCookie', () => {})
vi.stubGlobal('sendRedirect', async (_e: any, url: string) => { redirects.push(url); return url })
vi.stubGlobal('$fetch', async (url: string) => {
  googleCalls.push(url)
  if (url.includes('oauth2.googleapis.com')) return { access_token: 'at', refresh_token: 'rt' }
  return { email: 'google@x.de' }
})

const { createOAuthState, verifyOAuthState } = await import('../../server/utils/oauthState')
const { default: start } = await import('../../server/api/termine/google-auth.get')
const { default: callback } = await import('../../server/api/termine/google-callback.get')
beforeEach(() => { cookies.clear(); redirects.length = 0; googleCalls.length = 0; db.updates = [] })

describe('state-Helfer', () => {
  it('Rundlauf: gültig mit passendem Cookie, liefert Mandant und Nutzer', () => {
    const { state, nonce } = createOAuthState('T-CHEF', 'sub-chef')
    expect(verifyOAuthState(state, nonce)).toEqual({ tenantId: 'T-CHEF', userSub: 'sub-chef' })
  })
  it('manipulierter Mandant, falsche Signatur, fremdes oder fehlendes Cookie, Ablauf, nackte ID: alles abgelehnt', () => {
    const { state, nonce } = createOAuthState('T-CHEF', 'sub-chef', Date.now())
    const [body, sig] = state.split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), t: 'T-FREMD' })).toString('base64url')
    expect(verifyOAuthState(`${forged}.${sig}`, nonce)).toBeNull()
    expect(verifyOAuthState(`${body}.${sig.slice(0, -2)}xx`, nonce)).toBeNull()
    expect(verifyOAuthState(state, 'anderer-nonce')).toBeNull()
    expect(verifyOAuthState(state, undefined)).toBeNull()
    expect(verifyOAuthState(state, '')).toBeNull()
    expect(verifyOAuthState('T-CHEF', nonce)).toBeNull()
    expect(verifyOAuthState(state, nonce, Date.now() + 11 * 60_000)).toBeNull()
    expect(verifyOAuthState(undefined, nonce)).toBeNull()
  })
})

describe('Google-Rücksprung', () => {
  const fullFlow = async () => {
    await start({ query: { token: 'tok-chef' }, headers: {}, context: {} } as any)
    const url = new URL(redirects[0])
    return { state: url.searchParams.get('state')!, nonce: cookies.get('plx_oauth_nonce')! }
  }
  it('Start: ohne/mit ungültigem Token 401; gültig: signierter state (nicht die Mandanten-ID) + httpOnly-Cookie', async () => {
    await expect(start({ query: {}, headers: {}, context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    await expect(start({ query: { token: 'quatsch' }, headers: {}, context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    const { state, nonce } = await fullFlow()
    expect(state).not.toBe('T-CHEF'); expect(state).not.toContain('T-CHEF'); expect(nonce.length).toBeGreaterThan(10)
  })
  it('regulärer Ablauf: Rücksprung im selben Browser verbindet den Kalender des richtigen Mandanten', async () => {
    const { state, nonce } = await fullFlow(); redirects.length = 0
    await callback({ query: { code: 'abc', state }, cookies: { plx_oauth_nonce: nonce }, headers: {}, context: {} } as any)
    expect(db.updates).toHaveLength(1); expect(db.updates[0].Key).toEqual({ tenantId: 'T-CHEF' })
    expect(redirects[0]).toContain('google=connected')
  })
  it('Angriff: Rücksprung mit fremder Mandanten-ID als state (altes Verhalten) wird abgewiesen, Google und Datenbank bleiben unberührt', async () => {
    await callback({ query: { code: 'abc', state: 'T-CHEF' }, cookies: {}, headers: {}, context: {} } as any)
    expect(db.updates).toHaveLength(0); expect(googleCalls).toHaveLength(0)
    expect(redirects[0]).toContain('google=error')
  })
  it('Angriff: gültiger Link in einem anderen Browser (ohne Cookie) oder mit fremdem Cookie wird abgewiesen', async () => {
    const { state } = await fullFlow(); redirects.length = 0
    await callback({ query: { code: 'abc', state }, cookies: {}, headers: {}, context: {} } as any)
    await callback({ query: { code: 'abc', state }, cookies: { plx_oauth_nonce: 'fremd' }, headers: {}, context: {} } as any)
    expect(db.updates).toHaveLength(0); expect(googleCalls).toHaveLength(0)
    expect(redirects.every(r => r.includes('google=error'))).toBe(true)
  })
})
