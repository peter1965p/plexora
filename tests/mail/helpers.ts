import { vi } from 'vitest'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'

// Fakes für die Tests der Mail-Vorlagen: Einstellungen (plexora-settings), Team, Zähler, S3 und Versand.
export const st = {
  settings: new Map<string, any>(),                 // "settingId|scope"
  members: [] as any[], counters: new Map<string, number>(),
  s3: new Map<string, { body: Buffer; contentType: string; cacheControl?: string }>(), s3calls: [] as string[],
  mails: [] as any[], logs: [] as any[],
  failSettingsPut: false,
}
export const reset = () => { st.settings = new Map(); st.members = []; st.counters = new Map(); st.s3 = new Map(); st.s3calls = []; st.mails = []; st.logs = []; st.failSettingsPut = false }

export const fakeDb = () => ({
  async send(cmd: any) {
    const n = cmd.constructor.name; const i = cmd.input; const t = i.TableName
    if (t === 'plexora-newsletter-ratelimit' && n === 'UpdateCommand') { const c = (st.counters.get(i.Key.throttleKey) || 0) + 1; st.counters.set(i.Key.throttleKey, c); return { Attributes: { count: c } } }
    if (t === 'plexora-settings') {
      const k = i.Key ? `${i.Key.settingId}|${i.Key.scope}` : `${i.Item.settingId}|${i.Item.scope}`
      if (n === 'GetCommand') return { Item: st.settings.get(k) }
      if (n === 'PutCommand') { if (st.failSettingsPut) throw new Error('DB down'); st.settings.set(k, i.Item); return {} }
      if (n === 'DeleteCommand') { st.settings.delete(k); return {} }
    }
    if (t === 'plexora-team-members' && n === 'GetCommand') return { Item: st.members.find(m => m.tenantId === i.Key.tenantId && m.memberEmail === i.Key.memberEmail) }
    if (t === 'plexora-team-members' && n === 'PutCommand') { st.members = st.members.filter(m => !(m.tenantId === i.Item.tenantId && m.memberEmail === i.Item.memberEmail)); st.members.push(i.Item); return {} }
    if (t === 'plexora-team-members' && n === 'DeleteCommand') { st.members = st.members.filter(m => !(m.tenantId === i.Key.tenantId && m.memberEmail === i.Key.memberEmail)); return {} }
    if (t === 'plexora-team-members' && n === 'ScanCommand') return { Items: st.members.filter(m => m.memberEmail === i.ExpressionAttributeValues?.[':e'] && m.status === 'active') }
    if (t === 'plexora-mail-log' && n === 'PutCommand') { st.logs.push(i.Item); return {} }
    return {}
  },
})

export function installMocks() {
  vi.doMock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDb() }))
  vi.doMock('@aws-sdk/client-s3', () => ({
    S3Client: class { async send(c: any) { const name = c.constructor.cmd; const inp = c.input; st.s3calls.push(`${name}:${inp.Key}`); if (name === 'Put') st.s3.set(inp.Key, { body: inp.Body, contentType: inp.ContentType, cacheControl: inp.CacheControl }); if (name === 'Delete') st.s3.delete(inp.Key); return {} } },
    PutObjectCommand: class { static cmd = 'Put'; constructor(public input: any) {} }, DeleteObjectCommand: class { static cmd = 'Delete'; constructor(public input: any) {} },
  }))
  vi.doMock('resend', () => ({ Resend: class { emails = { send: async (m: any) => { st.mails.push(m); return { data: { id: '1' }, error: null } } } } }))
  vi.doMock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => (st.members.find(m => m.memberEmail === e && m.status === 'active')?.tenantId) || e, invalidateTenantCache: () => {} }))
  vi.stubGlobal('defineEventHandler', (fn: any) => fn)
  class HttpError extends Error { statusCode: number; data: any; constructor(o: any) { super(o.message); this.statusCode = o.statusCode; this.data = o.data } }
  vi.stubGlobal('createError', (o: any) => new HttpError(o))
  vi.stubGlobal('readBody', async (e: any) => e.body)
  vi.stubGlobal('getHeader', () => undefined)
  vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 'k' }))
}
export const ev = (auth: any, body?: any, params?: any) => ({ context: { auth }, body, params })
export const code = async (p: Promise<any>) => p.then((r) => ({ code: 200, r }), (e: any) => ({ code: e.statusCode, message: e.message, data: e.data }))
export const OWNER = { userId: 'sub-a', email: 'chef-a@firma.de', groups: ['customers'], emailVerified: true, name: 'Anna Chefin' }
export const OWNER_B = { userId: 'sub-b', email: 'chef-b@firma.de', groups: ['customers'], emailVerified: true, name: 'Bernd Chef' }
export const MEMBER = { userId: 'sub-m', email: 'mitglied@firma.de', groups: ['customers'], emailVerified: true }
export const DEMO = { userId: 'sub-d', email: 'demo@plexora.eu', groups: ['customers'], emailVerified: true }

export const pngB64 = (w = 200, h = 80) => { const p = new PNG({ width: w, height: h }); for (let i = 0; i < w * h; i++) { p.data[i * 4] = 10; p.data[i * 4 + 1] = 100; p.data[i * 4 + 2] = 220; p.data[i * 4 + 3] = 255 } return PNG.sync.write(p).toString('base64') }
export const jpgB64 = (w = 300, h = 100) => { const d = Buffer.alloc(w * h * 4, 180); return Buffer.from(jpeg.encode({ data: d, width: w, height: h }, 85).data).toString('base64') }
