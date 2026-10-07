import { vi } from 'vitest'

// Gerüst, das jeden API-Handler WIRKLICH aufruft (ohne Token bzw. als Besucher), statt im Quelltext nach Zeichenketten zu suchen.
// Alles, was nach außen geht (DynamoDB, S3, Cognito, Lambda, Mail, Netz), ist eine Falle: es wird protokolliert und scheitert.
export class HttpError extends Error { statusCode: number; constructor(o: any) { super(o?.message || o?.statusMessage || 'error'); this.statusCode = o?.statusCode ?? 500 } }

export const trip = { calls: [] as string[], mode: 'throw' as 'throw' | 'seed' }
export const WRITE_COMMANDS = /^(Put|Update|Delete|BatchWrite|TransactWrite|CreateTable|DeleteTable|UpdateTable)/

// "Seed": Antworten der Datenbank für die Besucher-Prüfung (siehe publicRoutes.evidence.ts). Im Modus "throw" scheitert jeder Zugriff.
export const seed: { get: (table: string, cmd: string, input: any) => any } = { get: () => ({}) }

const dbSend = async (cmd: any) => {
  const name = cmd?.constructor?.name || 'Command'
  trip.calls.push(`dynamo:${name}:${cmd?.input?.TableName || ''}`)
  if (trip.mode === 'throw') throw new Error('Datenbankzugriff in der Test-Falle')
  return seed.get(cmd?.input?.TableName || '', name, cmd?.input)
}

const trapClass = (label: string) => class { constructor(..._a: any[]) {} send = async (cmd: any) => { trip.calls.push(`${label}:${cmd?.constructor?.name || ''}`); throw new Error(`${label} in der Test-Falle`) } }

export function installRouteMocks() {
  vi.doMock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ send: dbSend }) }))
  // SDK-Module: Client = Falle, Befehle = einfache Klassen (der Name zeigt später im Protokoll, was versucht wurde)
  const cmds = (names: string[]) => Object.fromEntries(names.map(n => [n, class { constructor(public input?: any) {} }]))
  vi.doMock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: trapClass('dynamodb-client'), ...cmds(['DescribeTableCommand', 'ListTablesCommand', 'ScanCommand']) }))
  vi.doMock('@aws-sdk/client-s3', () => ({ S3Client: trapClass('s3'), ...cmds(['DeleteObjectCommand', 'GetObjectCommand', 'ListObjectsV2Command', 'PutObjectCommand']) }))
  vi.doMock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: async () => { trip.calls.push('s3:presign'); throw new Error('presign in der Test-Falle') } }))
  vi.doMock('@aws-sdk/client-cognito-identity-provider', () => ({ CognitoIdentityProviderClient: trapClass('cognito'), ...cmds(['AdminAddUserToGroupCommand', 'AdminCreateUserCommand', 'ListUsersCommand']) }))
  vi.doMock('@aws-sdk/client-lambda', () => ({ LambdaClient: trapClass('lambda'), ...cmds(['GetFunctionCommand', 'InvokeCommand', 'ListFunctionsCommand']) }))
  vi.doMock('@aws-sdk/client-cloudwatch-logs', () => ({ CloudWatchLogsClient: trapClass('logs'), ...cmds(['DescribeLogGroupsCommand', 'DescribeLogStreamsCommand', 'GetLogEventsCommand']) }))
  vi.doMock('@aws-sdk/client-cloudwatch', () => ({ CloudWatchClient: trapClass('cloudwatch'), ...cmds(['GetMetricStatisticsCommand']) }))
  vi.doMock('resend', () => ({ Resend: class { emails = { send: async (m: any) => { trip.calls.push(`mail:${String(m?.to)}`); throw new Error('Mail in der Test-Falle') } } } }))
  vi.doMock('stripe', () => ({ default: class { webhooks = { constructEvent: () => { throw new Error('Signatur ungültig') } }; checkout = { sessions: { create: async () => { trip.calls.push('stripe:checkout'); return { id: 'cs_test_1', url: 'https://stripe.example/pay/cs_test_1' } }, retrieve: async () => { trip.calls.push('stripe:retrieve'); throw new Error('Stripe in der Test-Falle') } } }; constructor(..._a: any[]) {} } }))
  vi.doMock('pdfkit', () => ({ default: class { constructor() { trip.calls.push('pdf'); throw new Error('PDF in der Test-Falle') } } }))
  vi.doMock('puppeteer-core', () => ({ default: { launch: async () => { trip.calls.push('browser'); throw new Error('Browser in der Test-Falle') } } }))
  vi.doMock('@sparticuz/chromium', () => ({ default: { args: [], executablePath: async () => '' } }))
}

export function installRouteGlobals(config: Record<string, any> = {}) {
  vi.stubGlobal('defineEventHandler', (fn: any) => fn)
  vi.stubGlobal('createError', (o: any) => new HttpError(o))
  vi.stubGlobal('readBody', async (e: any) => (e.body === undefined ? {} : e.body))
  vi.stubGlobal('readRawBody', async (e: any) => (typeof e.rawBody === 'string' ? e.rawBody : ''))
  vi.stubGlobal('getRouterParam', (e: any, n: string) => (e.params ? e.params[n] : undefined))
  vi.stubGlobal('getQuery', (e: any) => e.query || {})
  vi.stubGlobal('getHeader', (e: any, n: string) => e.headers?.[n.toLowerCase()])
  vi.stubGlobal('getMethod', (e: any) => e.method || 'GET')
  vi.stubGlobal('getRequestURL', (e: any) => new URL(`https://api.example${e.path || '/'}`))
  vi.stubGlobal('getCookie', (e: any, n: string) => e.cookies?.[n])
  for (const n of ['setCookie', 'deleteCookie']) vi.stubGlobal(n, () => {})
  vi.stubGlobal('setResponseHeaders', (e: any, h: any) => { Object.assign((e.res ||= {}), h) })
  vi.stubGlobal('setResponseHeader', (e: any, n: string, v: any) => { (e.res ||= {})[n] = v })
  vi.stubGlobal('setHeader', (e: any, n: string, v: any) => { (e.res ||= {})[n] = v })
  vi.stubGlobal('setResponseStatus', (e: any, c: number) => { (e.res ||= {}).__status = c })
  vi.stubGlobal('sendRedirect', async (e: any, url: string) => { (e.res ||= {}).__redirect = url; return url })
  vi.stubGlobal('useRuntimeConfig', () => ({
    encryptionKey: Buffer.alloc(32, 7).toString('base64'), resendApiKey: 'RESEND', stripeSecretKey: 'sk_test_x', newsletterCronSecret: 'CONFIG-CRON-SECRET', adminEmail: 'admin@plexora.test',
    googleClientId: 'cid', googleClientSecret: 'csec', authEnforce: 'false', ...config, public: { apiBase: 'https://api.example', awsUserPoolId: 'pool', awsClientId: 'client', ...(config.public || {}) },
  }))
  const net = async (url: any) => { trip.calls.push(`netz:${String(url).slice(0, 60)}`); throw new Error('Netzzugriff in der Test-Falle') }
  vi.stubGlobal('fetch', net); vi.stubGlobal('$fetch', net)
}

/** Ereignis wie es der Server baut. Alle Pfadparameter heißen "x" (gleiche Konvention wie die Allowlist). */
export function makeEvent(file: string, method: string, over: Record<string, any> = {}) {
  const names = [...file.matchAll(/\[(?:\.\.\.)?([^\]]+)\]/g)].map(m => m[1])
  return { method, path: '/api/x', params: Object.fromEntries(names.map(n => [n, 'x'])), query: {}, headers: {}, context: {}, ...over }
}

export const routeFiles = (glob: Record<string, () => Promise<any>>) => Object.keys(glob).sort().map((p) => {
  const rel = p.replace(/^.*server\/api\//, '')
  const m = rel.match(/^(.*?)\.(get|post|put|patch|delete)\.ts$/)
  const method = m ? m[2].toUpperCase() : 'GET'
  let path = m ? m[1] : rel.replace(/\.ts$/, '')
  path = path.replace(/\/index$/, '').replace(/^index$/, '')
  return { file: p, rel, method, urlPath: '/api/' + path, key: `${m ? method : 'ANY'} /api/${path}`, load: glob[p] }
})

// ── Auswertung "anonym aufgerufen" (gemeinsam für route-policy.test.ts und anon-calls.test.ts) ──
// Realistischer Angriff: eine anonyme Anfrage auf eine BESTEHENDE Datensatz-ID. Die Datenbank liefert deshalb vorhandene Zeilen (fremder Inhaber);
// die Route muss trotzdem mit 401/403 antworten und darf nichts schreiben, senden oder abrufen.
export const OTHER_TENANT_ROW = { userId: 'inhaber@fremd.de', tenantId: 'T-FREMD', memberEmail: 'inhaber@fremd.de', email: 'inhaber@fremd.de', status: 'active', name: 'Fremde Firma', title: 'Fremd', slug: 'x', fields: [], items: [], campaignId: 'x', formId: 'x', id: 'x' }
export function setupAnonEnv() {
  installRouteMocks(); installRouteGlobals()
  seed.get = (_t, cmd) => (cmd === 'GetCommand' ? { Item: { ...OTHER_TENANT_ROW } } : { Items: [{ ...OTHER_TENANT_ROW }], Count: 1 })
}
export type RouteFile = ReturnType<typeof routeFiles>[number]
export interface AnonResult { kind: 'kein-handler' | 'antwortet' | 'fehler'; status?: number; msg?: string; sideEffects: string[]; ok: boolean }

export async function callAnonymously(r: RouteFile): Promise<AnonResult> {
  trip.calls = []; trip.mode = 'seed'
  const mod: any = await r.load()
  const handler = mod.default
  const side = () => trip.calls.filter(c => WRITE_COMMANDS.test(c.split(':')[1] || '') || !c.startsWith('dynamo:'))
  if (typeof handler !== 'function') return { kind: 'kein-handler', sideEffects: [], ok: false }
  try { await handler(makeEvent(r.file, r.method)); return { kind: 'antwortet', sideEffects: side(), ok: false } }
  catch (e: any) {
    const status = e?.statusCode as number | undefined
    return { kind: 'fehler', status, msg: String(e?.message || e).slice(0, 120), sideEffects: side(), ok: (status === 401 || status === 403) && side().length === 0 }
  }
}
