import { vi } from 'vitest'

// Gemeinsame Fakes für die Bot-Schutz-Tests: DynamoDB (Settings, Kampagnen, Formulare …), Cloudflare-Siteverify, Nitro/h3-Globals.
export const db = {
  settings: new Map<string, any>(),           // "settingId|scope"
  campaigns: [] as any[],                     // plexora-marketing
  forms: [] as any[],                         // plexora-forms
  types: [] as any[],                         // plexora-termine-types
  nexora: [] as any[],                        // plexora-nexora
  counters: new Map<string, number>(),
  writes: [] as string[],
}
export const members: Record<string, string> = { 'maria@firma.de': 'chef@firma.de' }

export const cloudflare = {
  calls: [] as { secret: string; response: string; remoteip?: string }[],
  // Standard: Secret "good-secret-123" gültig, Token "valid-token" gültig auf Host app.plexora.eu
  respond: (secret: string, token: string): any => {
    if (secret !== 'good-secret-123') return { success: false, 'error-codes': ['invalid-input-secret'] }
    if (token === 'valid-token') return { success: true, hostname: 'app.plexora.eu', 'error-codes': [] }
    if (token === 'other-host-token') return { success: true, hostname: 'evil.example', 'error-codes': [] }
    return { success: false, 'error-codes': ['invalid-input-response'] }
  },
  down: false,
}

export function installGlobals() {
  vi.stubGlobal('useRuntimeConfig', () => ({ encryptionKey: Buffer.alloc(32, 7).toString('base64'), public: {} }))
  class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
  vi.stubGlobal('defineEventHandler', (fn: any) => fn)
  vi.stubGlobal('createError', (o: any) => new HttpError(o))
  vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
  vi.stubGlobal('setResponseHeader', () => {})
  vi.stubGlobal('setResponseHeaders', () => {})
  vi.stubGlobal('getMethod', (e: any) => e.method || 'POST')
  vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
  vi.stubGlobal('getQuery', (e: any) => e.query || {})
  vi.stubGlobal('readBody', async (e: any) => e.body)
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: any) => {
    if (cloudflare.down) throw new Error('network down')
    const p = new URLSearchParams(init.body)
    cloudflare.calls.push({ secret: p.get('secret') || '', response: p.get('response') || '', remoteip: p.get('remoteip') || undefined })
    return { ok: true, json: async () => cloudflare.respond(p.get('secret') || '', p.get('response') || '') }
  }))
}

export function fakeDynamo() {
  return {
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const t = i.TableName
      if (['PutCommand', 'UpdateCommand', 'DeleteCommand'].includes(n) && t !== 'plexora-newsletter-ratelimit') db.writes.push(`${t}:${n}`)
      if (t === 'plexora-newsletter-ratelimit') {
        const k = i.Key.throttleKey as string
        db.counters.set(k, (db.counters.get(k) || 0) + 1)
        return { Attributes: { count: db.counters.get(k) } }
      }
      if (t === 'plexora-settings') {
        if (n === 'GetCommand') return { Item: db.settings.get(`${i.Key.settingId}|${i.Key.scope}`) }
        if (n === 'PutCommand') { db.settings.set(`${i.Item.settingId}|${i.Item.scope}`, i.Item); return {} }
      }
      if (t === 'plexora-marketing') {
        if (n === 'QueryCommand') {
          const u = i.ExpressionAttributeValues[':u'] ?? i.ExpressionAttributeValues[':uid']
          let rows = db.campaigns.filter(c => c.userId === u)
          if (i.ExpressionAttributeValues[':t'] === true) rows = rows.filter(c => c.turnstileEnabled === true)
          if (i.ExpressionAttributeValues[':f']) rows = rows.filter(c => c.formId === i.ExpressionAttributeValues[':f'])
          if (i.ExpressionAttributeValues[':cid']) rows = rows.filter(c => c.campaignId === i.ExpressionAttributeValues[':cid'])
          return i.Select === 'COUNT' ? { Count: rows.length } : { Items: rows }
        }
        if (n === 'PutCommand') { db.campaigns.push(i.Item); return {} }
      }
      if (t === 'plexora-forms' && n === 'GetCommand') return { Item: db.forms.find(f => f.formId === i.Key.formId) }
      if (t === 'plexora-termine-types' && n === 'GetCommand') return { Item: db.types.find(x => x.typeId === i.Key.typeId && x.tenantId === i.Key.tenantId) }
      if (t === 'plexora-nexora' && n === 'GetCommand') return { Item: db.nexora.find(x => x.tenantId === i.Key.tenantId) }
      return {}
    },
  }
}

export function resetDb() {
  db.settings.clear(); db.campaigns = []; db.forms = []; db.types = []; db.nexora = []; db.counters.clear(); db.writes = []
  cloudflare.calls = []; cloudflare.down = false
}
export const resolveUserIdFake = async (e: string) => members[e] || e
export const authEv = (email: string, extra: any = {}, groups: string[] = ['customers']) =>
  ({ headers: {}, context: { auth: { userId: 'sub-' + email, email, groups } }, params: {}, query: {}, ...extra })
export const code = (p: Promise<any>) => p.then(() => 200, (e: any) => e.statusCode)
