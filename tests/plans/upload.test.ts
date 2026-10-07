import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sniffImage, isSafeSvg, extType } from '../../server/utils/imageSniff'

// ── Fakes: S3, DynamoDB (Lizenzen, Team, Zähler), Nitro ──
const st = { licenses: [] as any[], team: [] as any[], counters: new Map<string, number>(), puts: [] as any[], enforce: '' as any }
class HttpError extends Error { statusCode: number; data: any; constructor(o: any) { super(o.message || o.statusMessage); this.statusCode = o.statusCode; this.data = o.data } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('useRuntimeConfig', () => ({ planEnforce: st.enforce }))
vi.spyOn(console, 'warn').mockImplementation(() => {}); vi.spyOn(console, 'error').mockImplementation(() => {})
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class { async send(c: any) { st.puts.push(c.input); return {} } },
  PutObjectCommand: class { input: any; constructor(i: any) { this.input = i } },
}))
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const i = cmd.input; const t = i.TableName; const v = i.ExpressionAttributeValues || {}
      if (t === 'plexora-newsletter-ratelimit') { const k = i.Key.throttleKey; const c = (st.counters.get(k) || 0) + 1; st.counters.set(k, c); return { Attributes: { count: c } } }
      if (t === 'plexora-licenses') return { Items: st.licenses.filter(l => l.customerEmail === v[':e']) }
      if (t === 'plexora-team-members') return { Items: st.team.filter(m => m.memberEmail === v[':e'] && m.status === 'active') }
      return { Items: [] }
    },
  }),
}))
const { default: upload } = await import('../../server/api/aws/s3-upload.post')
const { invalidatePlanCache } = await import('../../server/utils/tenantPlan')

const sig = { png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), jpg: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), gif: Buffer.from('GIF89a'), webp: Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]) }
const file = (type: keyof typeof sig, size = 200) => Buffer.concat([sig[type], Buffer.alloc(Math.max(0, size - sig[type].length), 1)])
const b64 = (b: Buffer | string) => 'data:image/x;base64,' + Buffer.from(b).toString('base64')
const SVG_OK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#08f"/></svg>'
const auth = (email: string, groups: string[] = ['customers']) => ({ context: { auth: { userId: 's', email, groups } } })
const up = async (email: string, body: any, groups?: string[]) => { try { return { code: 200, res: await (upload as any)({ ...auth(email, groups), body }) } } catch (e: any) { return { code: e.statusCode as number, data: e.data, msg: e.message } } }
const PRO = { customerEmail: 'chef@firma.de', tier: 'pro', status: 'active', modules: ['crm'] }
beforeEach(() => { st.licenses = []; st.team = []; st.counters.clear(); st.puts.length = 0; st.enforce = ''; invalidatePlanCache() })

describe('Dateiinhalt statt Endung', () => {
  it('erkennt Bildtypen an den ersten Bytes', () => {
    for (const t of ['png', 'jpg', 'gif', 'webp'] as const) expect(sniffImage(file(t)), t).toBe(t)
    expect(sniffImage(Buffer.from(SVG_OK))).toBe('svg'); expect(sniffImage(Buffer.from('<?xml version="1.0"?>\n<!-- x -->\n' + SVG_OK))).toBe('svg')
    for (const b of ['<html><script>alert(1)</script>', 'GIF9a', 'MZ\x90\x00', '', 'RIFF\0\0\0\0WAVE']) expect(sniffImage(Buffer.from(b)), b).toBeNull()
  })
  it('Endung -> Typ; unbekannt null (auch geerbte Namen)', () => {
    expect(extType('JPEG')).toBe('jpg'); expect(extType('png')).toBe('png'); expect(extType('constructor')).toBeNull(); expect(extType('html')).toBeNull()
  })
  it('SVG mit aktiven Inhalten wird erkannt, einfaches SVG nicht', () => {
    expect(isSafeSvg(SVG_OK)).toBe(true)
    expect(isSafeSvg('<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,AAAA"/><a href="#x"/></svg>')).toBe(true)
    for (const bad of [
      '<svg><script>alert(1)</script></svg>', '<svg onload="alert(1)"/>', '<svg><rect ONCLICK = "x"/></svg>', '<svg><foreignObject><iframe src="x"/></foreignObject></svg>',
      '<svg><a href="javascript:alert(1)"><text>x</text></a></svg>', '<svg><a xlink:href="https://evil.example/x">x</a></svg>', '<svg><image href="//evil.example/p.png"/></svg>',
      '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>', '<svg><style>@import url(https://evil.example/a.css);</style></svg>', '<svg><use href="https://evil.example/x.svg#a"/></svg>',
      '<svg><a href="java\tscript:alert(1)">x</a></svg>', '<svg><animate attributeName="href" values="javascript:alert(1)"/></svg>',
    ]) expect(isSafeSvg(bad), bad).toBe(false)
  })
})

describe('s3-upload: Inhalt, Mandanten-Ordner', () => {
  it('HTML/Skript als .png, falsche Endung und unsichere SVG: 400, nichts geht an S3', async () => {
    for (const [name, body] of [['bild.png', Buffer.from('<html><script>alert(1)</script></html>')], ['bild.jpg', file('png')], ['bild.png', file('gif')], ['a.svg', Buffer.from('<svg onload="alert(1)"/>')], ['a.svg', file('png')]] as const)
      expect((await up('kunde@firma.de', { fileBase64: b64(body), fileName: name, prefix: 'marketing/' })).code, name).toBe(400)
    expect(st.puts).toHaveLength(0)
  })
  it('echte Bilder aller Formate gehen; der Schlüssel enthält einen Mandanten-Ordner', async () => {
    st.licenses = [PRO]
    for (const [t, n] of [['png', 'a.png'], ['jpg', 'a.jpeg'], ['gif', 'a.gif'], ['webp', 'a.webp']] as const) expect((await up('chef@firma.de', { fileBase64: b64(file(t)), fileName: n, prefix: 'marketing/' })).code, n).toBe(200)
    expect((await up('chef@firma.de', { fileBase64: b64(SVG_OK), fileName: 'logo.svg', prefix: 'branding/' })).code).toBe(200)
    expect(st.puts).toHaveLength(5); for (const p of st.puts) expect(p.Key).toMatch(/^(marketing|branding)\/[0-9a-f]{16}\/[A-Za-z0-9._-]+$/)
  })
  it('zwei Konten mit demselben Dateinamen überschreiben sich nicht; Team-Mitglied schreibt in den Ordner des Inhabers', async () => {
    st.licenses = [PRO]; st.team = [{ tenantId: 'chef@firma.de', memberEmail: 'sylvia@firma.de', status: 'active' }]
    const key = async (email: string) => { st.puts.length = 0; await up(email, { fileBase64: b64(file('png')), fileName: 'logo.png', prefix: 'marketing/' }); return st.puts[0].Key as string }
    const a = await key('chef@firma.de'), b = await key('fremd@firma.de'), c = await key('sylvia@firma.de')
    expect(a).not.toBe(b); expect(c).toBe(a)
  })
})

describe('s3-upload: Tarif-Limits', () => {
  const MB = 1024 * 1024
  it('Beobachtungsmodus: nichts wird abgelehnt (Free, 3 MB, SVG, viele Uploads)', async () => {
    expect((await up('neu@x.de', { fileBase64: b64(file('png', 3 * MB)), fileName: 'a.png', prefix: 'marketing/' })).code).toBe(200)
    expect((await up('neu@x.de', { fileBase64: b64(SVG_OK), fileName: 'a.svg', prefix: 'marketing/' })).code).toBe(200)
    for (let i = 0; i < 30; i++) expect((await up('neu@x.de', { fileBase64: b64(file('png')), fileName: 'a.png', prefix: 'marketing/' })).code).toBe(200)
  })
  describe('scharf', () => {
    beforeEach(() => { st.enforce = 'true' })
    it('Free: Datei über 1 MB 413 mit Code, SVG 402, bis 1 MB PNG geht', async () => {
      const big = await up('neu@x.de', { fileBase64: b64(file('png', 2 * MB)), fileName: 'a.png', prefix: 'marketing/' })
      expect(big.code).toBe(413); expect(big.data).toMatchObject({ code: 'UPLOAD_TOO_LARGE', plan: 'free', max: MB })
      expect((await up('neu@x.de', { fileBase64: b64(SVG_OK), fileName: 'a.svg', prefix: 'marketing/' })).code).toBe(402)
      expect((await up('neu@x.de', { fileBase64: b64(file('png', 0.5 * MB)), fileName: 'a.png', prefix: 'marketing/' })).code).toBe(200)
    })
    it('Free: 5 Uploads am Tag, der sechste 429', async () => {
      const codes: number[] = []
      for (let i = 0; i < 6; i++) codes.push((await up('neu@x.de', { fileBase64: b64(file('png')), fileName: `a${i}.png`, prefix: 'marketing/' })).code)
      expect(codes).toEqual([200, 200, 200, 200, 200, 429])
    })
    it('Starter: 6 MB zu groß (5 MB), 4 MB und SVG gehen; Pro: 7 MB geht', async () => {
      st.licenses = [{ ...PRO, tier: 'starter' }]
      expect((await up('chef@firma.de', { fileBase64: b64(file('png', 6 * MB)), fileName: 'a.png', prefix: 'marketing/' })).code).toBe(413)
      expect((await up('chef@firma.de', { fileBase64: b64(file('png', 4 * MB)), fileName: 'a.png', prefix: 'marketing/' })).code).toBe(200)
      expect((await up('chef@firma.de', { fileBase64: b64(SVG_OK), fileName: 'a.svg', prefix: 'marketing/' })).code).toBe(200)
      st.licenses = [PRO]; invalidatePlanCache()
      expect((await up('chef@firma.de', { fileBase64: b64(file('png', 7 * MB)), fileName: 'b.png', prefix: 'marketing/' })).code).toBe(200)
    })
    it('20 Uploads pro Stunde auch für zahlende Konten', async () => {
      st.licenses = [{ ...PRO, tier: 'enterprise' }]
      const codes: number[] = []
      for (let i = 0; i < 21; i++) codes.push((await up('chef@firma.de', { fileBase64: b64(file('png')), fileName: `a${i}.png`, prefix: 'marketing/' })).code)
      expect(codes.filter(c => c === 200)).toHaveLength(20); expect(codes[20]).toBe(429)
    })
    it('Betreiber (admins) sind ausgenommen', async () => {
      for (let i = 0; i < 30; i++) expect((await up('peter@x.de', { fileBase64: b64(file('png', 3 * MB)), fileName: 'a.png', prefix: 'marketing/' }, ['admins'])).code).toBe(200)
    })
  })
})
