import { describe, it, expect, vi, beforeEach } from 'vitest'
import { passwordProblem } from '../../shared/passwordRules'

// ── Fakes: DynamoDB (Zähler-Tabelle mit Bedingungen), Cognito, Versand ──
const st = {
  items: new Map<string, any>(), users: [] as any[], setCalls: [] as any[], mails: [] as any[], logs: [] as string[],
  setError: null as null | string, listError: false,
}
class HttpError extends Error { statusCode: number; data: any; constructor(o: any) { super(o.message); this.statusCode = o.statusCode; this.data = o.data } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
vi.stubGlobal('setResponseHeader', () => {})
vi.stubGlobal('useRuntimeConfig', () => ({ public: { awsUserPoolId: 'pool-1' }, planEnforce: '', adminEmail: '' }))
vi.spyOn(console, 'error').mockImplementation((...a: any[]) => { st.logs.push(a.join(' ')) }); vi.spyOn(console, 'warn').mockImplementation((...a: any[]) => { st.logs.push(a.join(' ')) })
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const key = i.Key?.throttleKey ?? i.Item?.throttleKey
      if (i.TableName !== 'plexora-newsletter-ratelimit') return { Items: [] }
      if (n === 'UpdateCommand') { const row = st.items.get(key) || {}; row.count = (row.count || 0) + i.ExpressionAttributeValues[':one'] ; st.items.set(key, row); return { Attributes: row } }
      if (n === 'PutCommand') {
        if (i.ConditionExpression && st.items.has(key)) { const e: any = new Error('c'); e.name = 'ConditionalCheckFailedException'; throw e }
        st.items.set(key, { ...i.Item }); return {}
      }
      if (n === 'GetCommand') return { Item: st.items.get(key) ? { ...st.items.get(key) } : undefined }
      if (n === 'DeleteCommand') {
        const had = st.items.get(key)
        if (i.ConditionExpression && !had) { const e: any = new Error('c'); e.name = 'ConditionalCheckFailedException'; throw e }
        st.items.delete(key); return { Attributes: had }
      }
      return {}
    },
  }),
}))
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: class {
    async send(c: any) {
      if (c.constructor.name === 'ListUsersCommand') {
        if (st.listError) throw new Error('down')
        const f: string = c.input.Filter; const m = f.match(/^(email|username) = "(.*)"$/)!
        const rows = st.users.filter(u => (m[1] === 'email' ? u.email === m[2] : u.username === m[2]))
        return { Users: rows.map(u => ({ Username: u.username, UserStatus: u.status, Enabled: u.enabled !== false, Attributes: [{ Name: 'email', Value: u.email }] })) }
      }
      if (c.constructor.name === 'AdminSetUserPasswordCommand') {
        if (st.setError) { const e: any = new Error(st.setError); e.name = st.setError; throw e }
        st.setCalls.push(c.input); const u = st.users.find(x => x.username === c.input.Username); if (u && c.input.Permanent) u.status = 'CONFIRMED'; return {}
      }
      return {}
    }
  },
  ListUsersCommand: class { constructor(public input: any) {} }, AdminSetUserPasswordCommand: class { constructor(public input: any) {} },
}))
vi.mock('../../server/utils/mailer', () => ({ sendMail: async (m: any) => { st.mails.push(m); return 'sent' } }))

const { default: setPassword } = await import('../../server/api/auth/set-password.post')
const { default: requestLink } = await import('../../server/api/auth/request-set-password.post')
const { issueSetPasswordToken, redeemSetPasswordToken, TOKEN_RE } = await import('../../server/utils/welcomeToken')

const ev = (body: any, ip = '1.1.1.1') => ({ body, headers: { 'x-forwarded-for': ip } })
const call = async (fn: any, body: any, ip?: string) => { try { return { code: 200, res: await fn(ev(body, ip)) } } catch (e: any) { return { code: e.statusCode as number, data: e.data, msg: e.message } } }
const PW = 'Ein-gutes-Passwort-42!'
const user = (over: any = {}) => ({ username: 'kunde_firma_de_1', email: 'kunde@firma.de', status: 'FORCE_CHANGE_PASSWORD', ...over })
let n = 0
beforeEach(() => { st.items.clear(); st.users = [user()]; st.setCalls.length = 0; st.mails.length = 0; st.logs.length = 0; st.setError = null; st.listError = false; n++; vi.useRealTimers() })
let k = 0
const ip = () => `10.0.${n}.${++k % 250}`

describe('Passwortregeln', () => {
  it('mindestens 12 Zeichen, Groß, Klein, Ziffer, Sonderzeichen, keine Leerzeichen am Rand', () => {
    expect(passwordProblem(PW)).toBeNull()
    for (const bad of [undefined, '', 'Kurz1!', 'nurkleinbuchstaben1!', 'NURGROSSBUCHSTABEN1!', 'KeineZiffernHierx!', 'KeinSonderzeichen12', ' Ein-gutes-Passwort-42!', 'Ein-gutes-Passwort-42! ', 'a'.repeat(129) + 'A1!', 12345678901234 as any])
      expect(passwordProblem(bad), String(bad)).toBeTruthy()
  })
})

describe('Token', () => {
  it('hat 256 Bit (43 Zeichen), gespeichert wird nur der Hash, nie das Token', async () => {
    const t = await issueSetPasswordToken('u', 'a@b.de'); expect(t).toMatch(TOKEN_RE)
    expect(JSON.stringify([...st.items.entries()])).not.toContain(t)
  })
  it('gilt 60 Minuten und genau einmal', async () => {
    const now = Date.now(); const t = await issueSetPasswordToken('u', 'a@b.de', now)
    expect(await redeemSetPasswordToken(t, now + 61 * 60_000)).toBeNull()
    const t2 = await issueSetPasswordToken('u', 'a@b.de', now)
    expect(await redeemSetPasswordToken(t2, now + 59 * 60_000)).toMatchObject({ username: 'u', email: 'a@b.de' })
    expect(await redeemSetPasswordToken(t2, now + 59 * 60_000)).toBeNull()
  })
  it('ein neuerer Link macht den älteren ungültig', async () => {
    const a = await issueSetPasswordToken('u', 'a@b.de'); const b = await issueSetPasswordToken('u', 'a@b.de')
    expect(await redeemSetPasswordToken(a)).toBeNull(); expect(await redeemSetPasswordToken(b)).not.toBeNull()
  })
  it('zwei gleichzeitige Einlösungen: genau eine gewinnt', async () => {
    const t = await issueSetPasswordToken('u', 'a@b.de')
    const r = await Promise.all([redeemSetPasswordToken(t), redeemSetPasswordToken(t), redeemSetPasswordToken(t)])
    expect(r.filter(Boolean)).toHaveLength(1)
  })
  it('falsche Formen und Typen werden ohne Datenbankzugriff abgelehnt', async () => {
    for (const bad of [undefined, null, 5, '', 'kurz', 'A'.repeat(42), 'A'.repeat(44), '../../x' + 'A'.repeat(40), { a: 1 }]) expect(await redeemSetPasswordToken(bad)).toBeNull()
  })
})

describe('POST /api/auth/set-password', () => {
  it('gültiger Link: Passwort wird dauerhaft gesetzt, Link ist verbraucht, Bestätigungsmail ohne Link und ohne Passwort', async () => {
    const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de')
    const r = await call(setPassword, { token: t, password: PW }, ip()); expect(r).toMatchObject({ code: 200, res: { success: true } })
    expect(st.setCalls).toEqual([{ UserPoolId: 'pool-1', Username: 'kunde_firma_de_1', Password: PW, Permanent: true }])
    expect((await call(setPassword, { token: t, password: PW }, ip())).code).toBe(400)         // zweiter Versuch
    expect(st.setCalls).toHaveLength(1)
    expect(st.mails).toHaveLength(1); expect(st.mails[0]).toMatchObject({ kind: 'welcome', to: 'kunde@firma.de' })
    expect(st.mails[0].html + st.mails[0].text).not.toContain(PW); expect(st.mails[0].html + st.mails[0].text).not.toMatch(/set-password#t=/)
  })
  it('das Passwort steht nirgends in Antwort oder Protokoll', async () => {
    const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de')
    const r = await call(setPassword, { token: t, password: PW }, ip())
    expect(JSON.stringify(r)).not.toContain(PW); expect(st.logs.join('\n')).not.toContain(PW); expect(JSON.stringify([...st.items.values()])).not.toContain(PW)
  })
  it('ungültiges Token: 400 LINK_INVALID, Cognito wird nie gefragt', async () => {
    for (const token of ['', 'quatsch', 'A'.repeat(43), undefined]) { const r = await call(setPassword, { token, password: PW }, ip()); expect(r).toMatchObject({ code: 400, data: { code: 'LINK_INVALID' } }) }
    expect(st.setCalls).toEqual([])
  })
  it('zu schwaches Passwort: 400 PASSWORD_RULES und das Token bleibt gültig', async () => {
    const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de')
    expect(await call(setPassword, { token: t, password: 'kurz' }, ip())).toMatchObject({ code: 400, data: { code: 'PASSWORD_RULES' } })
    expect((await call(setPassword, { token: t, password: PW }, ip())).code).toBe(200)
  })
  it('abgelaufener Link: 400', async () => {
    vi.useFakeTimers(); const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de'); vi.advanceTimersByTime(61 * 60_000)
    expect(await call(setPassword, { token: t, password: PW }, ip())).toMatchObject({ code: 400, data: { code: 'LINK_INVALID' } }); expect(st.setCalls).toEqual([])
  })
  it('schon eingerichtetes Konto (CONFIRMED): der Link überschreibt das Passwort NICHT', async () => {
    st.users = [user({ status: 'CONFIRMED' })]
    const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de')
    expect(await call(setPassword, { token: t, password: PW }, ip())).toMatchObject({ code: 400, data: { code: 'ALREADY_SET' } }); expect(st.setCalls).toEqual([])
  })
  it('deaktiviertes oder fehlendes Konto: kein Setzen', async () => {
    for (const u of [[user({ enabled: false })], []]) { st.users = u as any; const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de'); expect((await call(setPassword, { token: t, password: PW }, ip())).code).toBe(400) }
    expect(st.setCalls).toEqual([])
  })
  it('Cognito lehnt das Passwort ab (InvalidPassword): Token wird zurückgegeben, ein anderes Passwort klappt', async () => {
    const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de'); st.setError = 'InvalidPasswordException'
    expect(await call(setPassword, { token: t, password: PW }, ip())).toMatchObject({ code: 400, data: { code: 'PASSWORD_RULES' } })
    st.setError = null; expect((await call(setPassword, { token: t, password: PW + 'x' }, ip())).code).toBe(200)
  })
  it('fehlendes AWS-Recht (AccessDenied): 503 mit klarer Meldung, Token wird zurückgegeben, nichts gesetzt', async () => {
    const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de'); st.setError = 'AccessDeniedException'
    const r = await call(setPassword, { token: t, password: PW }, ip()); expect(r).toMatchObject({ code: 503, data: { code: 'TEMPORARY' } }); expect(r.msg).toMatch(/noch nicht freigeschaltet/)
    st.setError = null; expect((await call(setPassword, { token: t, password: PW }, ip())).code).toBe(200)
  })
  it('Cognito nicht erreichbar bei der Statusprüfung: 503 und das Token bleibt gültig', async () => {
    const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de'); st.listError = true
    expect((await call(setPassword, { token: t, password: PW }, ip())).code).toBe(503)
    st.listError = false; expect((await call(setPassword, { token: t, password: PW }, ip())).code).toBe(200)
  })
  it('zwei gleichzeitige Anfragen mit demselben Link: genau ein Setzen', async () => {
    const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de')
    const r = await Promise.all([call(setPassword, { token: t, password: PW }, ip()), call(setPassword, { token: t, password: PW + '1' }, ip())])
    expect(r.filter(x => x.code === 200)).toHaveLength(1); expect(st.setCalls).toHaveLength(1)
  })
  it('Drossel je Token: nach 10 Versuchen mit demselben Token (von wechselnden Adressen) 429, auch mit richtigem Passwort', async () => {
    const t = await issueSetPasswordToken('kunde_firma_de_1', 'kunde@firma.de'); const codes: number[] = []
    for (let i = 0; i < 11; i++) codes.push((await call(setPassword, { token: t, password: 'kurz' }, ip())).code)
    expect(codes.slice(0, 10).every(c => c === 400)).toBe(true); expect(codes[10]).toBe(429)
    expect((await call(setPassword, { token: t, password: PW }, ip())).code).toBe(429); expect(st.setCalls).toEqual([])
  })
  it('Drossel je IP: nach 5 Versuchen pro Minute 429', async () => {
    const same = ip(); const codes: number[] = []
    for (let i = 0; i < 7; i++) codes.push((await call(setPassword, { token: 'x', password: PW }, same)).code)
    expect(codes.slice(0, 5)).toEqual([400, 400, 400, 400, 400]); expect(codes[5]).toBe(429)
  })
})

describe('POST /api/auth/request-set-password', () => {
  const SAME = { success: true, message: 'Falls auf diese Adresse ein Konto wartet, ist eine E-Mail mit einem neuen Link unterwegs.' }
  it('wartendes Konto: Mail mit gültigem Link; die Antwort ist die Einheitsantwort', async () => {
    const r = await call(requestLink, { email: ' Kunde@Firma.de ' }, ip()); expect(r).toEqual({ code: 200, res: SAME })
    expect(st.mails).toHaveLength(1); expect(st.mails[0]).toMatchObject({ kind: 'welcome', to: 'kunde@firma.de' })
    const url = (st.mails[0].text as string).match(/https:\/\/app\.plexora\.eu\/set-password#t=([A-Za-z0-9_-]{43})/); expect(url).toBeTruthy()
    expect(await call(setPassword, { token: url![1], password: PW }, ip())).toMatchObject({ code: 200 })
  })
  it('unbekannte Adresse, schon eingerichtetes Konto, Google-Konto, kaputte Adresse, Fehler: gleiche Antwort, keine Mail', async () => {
    const outs: any[] = []
    outs.push(await call(requestLink, { email: 'niemand@x.de' }, ip()))
    st.users = [user({ status: 'CONFIRMED' })]; outs.push(await call(requestLink, { email: 'kunde@firma.de' }, ip()))
    st.users = [user({ username: 'Google_123' })]; outs.push(await call(requestLink, { email: 'kunde@firma.de' }, ip()))
    outs.push(await call(requestLink, { email: 'kein-mail' }, ip()), await call(requestLink, { email: '"; x' }, ip()), await call(requestLink, {}, ip()), await call(requestLink, { email: 5 }, ip()))
    st.users = [user()]; st.listError = true; outs.push(await call(requestLink, { email: 'kunde@firma.de' }, ip()))
    for (const o of outs) expect(o).toEqual({ code: 200, res: SAME }); expect(st.mails).toEqual([])
  })
  it('je Adresse höchstens 3 Mails pro Stunde, danach weiter die Einheitsantwort ohne Mail', async () => {
    for (let i = 0; i < 5; i++) expect(await call(requestLink, { email: 'kunde@firma.de' }, ip() + i)).toEqual({ code: 200, res: SAME })
    expect(st.mails).toHaveLength(3)
  })
  it('mehrdeutige Konten (zwei mit derselben Adresse, eines schon eingerichtet oder beide wartend): kein Link', async () => {
    st.users = [user(), user({ username: 'zweites_konto', status: 'CONFIRMED' })]; expect(await call(requestLink, { email: 'kunde@firma.de' }, ip())).toEqual({ code: 200, res: SAME })
    st.users = [user(), user({ username: 'zweites_konto' })]; expect(await call(requestLink, { email: 'kunde@firma.de' }, ip())).toEqual({ code: 200, res: SAME })
    expect(st.mails).toEqual([])
  })
  it('ein neuer Link macht den vorigen ungültig', async () => {
    await call(requestLink, { email: 'kunde@firma.de' }, ip() + 'a'); await call(requestLink, { email: 'kunde@firma.de' }, ip() + 'b')
    const tok = (m: any) => (m.text as string).match(/#t=([A-Za-z0-9_-]{43})/)![1]
    expect((await call(setPassword, { token: tok(st.mails[0]), password: PW }, ip())).code).toBe(400)
    expect((await call(setPassword, { token: tok(st.mails[1]), password: PW }, ip())).code).toBe(200)
  })
})
