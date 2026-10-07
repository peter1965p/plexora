import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { installGlobals } from '../botprotection/helpers'
import { isPublicRoute } from '../../server/utils/routePolicy'

const used = new Set<string>(); let storeDown = false
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const i = cmd.input
      if (i.TableName === 'plexora-newsletter-ratelimit') {
        if (storeDown) throw new Error('boom')
        const k = i.Key.throttleKey
        if (i.ConditionExpression && used.has(k)) { const e: any = new Error('cond'); e.name = 'ConditionalCheckFailedException'; throw e }
        used.add(k)
      }
      return {}
    },
  }),
}))
installGlobals()
const headers: Record<string, string> = {}
vi.stubGlobal('useRuntimeConfig', () => ({ encryptionKey: Buffer.alloc(32, 7).toString('base64'), googleClientId: 'cid', googleClientSecret: 'csec', public: { apiBase: 'https://api.example' } }))
vi.stubGlobal('setResponseHeader', (_e: any, n: string, v: string) => { headers[n] = v })
const { createTicket, redeemTicket, TICKET_TTL_SECONDS } = await import('../../server/utils/oneTimeTicket')
const { default: start } = await import('../../server/api/termine/google-auth-start.post')
beforeEach(() => { used.clear(); storeDown = false; Object.keys(headers).forEach(k => delete headers[k]) })
const ID = { userId: 'sub-chef', email: 'chef@firma.de' }
const ev = (auth: any) => ({ context: { auth }, headers: {} })

describe('Einmalwert: gültig genau einmal, kurz, nur für seinen Zweck', () => {
  it('Rundlauf: liefert die Identität, die beim Erzeugen in der Anmeldung stand', async () => {
    expect(await redeemTicket(createTicket(ID, 'google-auth'), 'google-auth')).toEqual(ID)
  })
  it('einmalig: das zweite Einlösen scheitert, auch mit identischem Wert', async () => {
    const t = createTicket(ID, 'google-auth')
    expect(await redeemTicket(t, 'google-auth')).not.toBeNull(); expect(await redeemTicket(t, 'google-auth')).toBeNull()
  })
  it('60 Sekunden: davor gültig, danach nicht', async () => {
    expect(TICKET_TTL_SECONDS).toBe(60)
    const now = Date.now()
    expect(await redeemTicket(createTicket(ID, 'google-auth', now), 'google-auth', now + 59_000)).not.toBeNull()
    expect(await redeemTicket(createTicket(ID, 'google-auth', now), 'google-auth', now + 61_000)).toBeNull()
  })
  it('nur für den Vorgang, für den er ausgestellt wurde', async () => {
    expect(await redeemTicket(createTicket(ID, 'google-auth'), 'anderer-zweck')).toBeNull()
  })
  it('gefälscht, verändert oder kaputt: abgelehnt (andere E-Mail, andere Signatur, Müll, Typfehler)', async () => {
    const t = createTicket(ID, 'google-auth'); const [body, sig] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), m: 'opfer@firma.de' })).toString('base64url')
    for (const bad of [`${forged}.${sig}`, `${body}.${sig.slice(0, -2)}xx`, `${body}.`, '.', 'quatsch', '', undefined, null, 42, {}, 'a'.repeat(5000)]) expect(await redeemTicket(bad, 'google-auth'), String(bad).slice(0, 20)).toBeNull()
    expect(used.size).toBe(0)     // nichts davon hat etwas verbraucht
  })
  it('ein Wert mit anderem Schlüssel (fremde Installation) wird abgelehnt', async () => {
    const t = createTicket(ID, 'google-auth')
    vi.stubGlobal('useRuntimeConfig', () => ({ encryptionKey: Buffer.alloc(32, 9).toString('base64'), public: {} }))
    expect(await redeemTicket(t, 'google-auth')).toBeNull()
    vi.stubGlobal('useRuntimeConfig', () => ({ encryptionKey: Buffer.alloc(32, 7).toString('base64'), googleClientId: 'cid', googleClientSecret: 'csec', public: { apiBase: 'https://api.example' } }))
  })
  it('im Zweifel ablehnen: ist der Speicher nicht erreichbar, wird nicht eingelöst', async () => {
    storeDown = true; expect(await redeemTicket(createTicket(ID, 'google-auth'), 'google-auth')).toBeNull()
  })
})

describe('Start der Verknüpfung (POST)', () => {
  it('ohne Anmeldung 401, Demo-Konto 403, Token ohne E-Mail 401', async () => {
    await expect(Promise.resolve().then(() => start(ev(undefined) as any))).rejects.toMatchObject({ statusCode: 401 })
    await expect(Promise.resolve().then(() => start(ev({ ...ID, email: 'demo@plexora.eu', groups: [] }) as any))).rejects.toMatchObject({ statusCode: 403 })
    await expect(Promise.resolve().then(() => start(ev({ userId: 's', email: '', groups: [] }) as any))).rejects.toMatchObject({ statusCode: 401 })
  })
  it('liefert eine Adresse mit Einmalwert – das Anmeldetoken kommt darin nie vor – und der Wert gehört zum Aufrufer', async () => {
    const r: any = await start(ev({ ...ID, groups: [], idToken: 'GEHEIMES-TOKEN' }) as any)
    const u = new URL(r.url)
    expect(u.origin + u.pathname).toBe('https://api.example/api/termine/google-auth'); expect(u.searchParams.has('token')).toBe(false)
    expect(r.url).not.toContain('GEHEIMES-TOKEN')
    expect(await redeemTicket(u.searchParams.get('ticket'), 'google-auth')).toEqual(ID)
  })
})

describe('Route, Allowlist und Oberfläche', () => {
  const route = readFileSync('server/api/termine/google-auth.get.ts', 'utf8')
  it('die Route liest kein Anmeldetoken mehr aus der Adresse und sendet kein Referrer', () => {
    expect(route).not.toMatch(/verifyToken|\.token\b|query\.token/); expect(route).toContain("getQuery(event).ticket"); expect(route).toContain("'Referrer-Policy', 'no-referrer'")
    expect(route).toContain("redeemTicket(getQuery(event).ticket, 'google-auth')")
  })
  it('google-auth (GET) steht mit Begründung in der Allowlist, der Start (POST) verlangt Anmeldung', () => {
    expect(isPublicRoute('/api/termine/google-auth', 'GET')).toBe(true); expect(isPublicRoute('/api/termine/google-auth', 'POST')).toBe(false); expect(isPublicRoute('/api/termine/google-auth-start', 'POST')).toBe(false)
  })
  it('keine Stelle der Oberfläche baut mehr eine Adresse mit dem Anmeldetoken', () => {
    for (const f of ['app/pages/settings/index.vue', 'app/pages/termine/index.vue']) {
      const s = readFileSync(f, 'utf8'); expect(s, f).not.toMatch(/google-auth\?token=/); expect(s, f).toContain('/api/termine/google-auth-start')
    }
  })
})
