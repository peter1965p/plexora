import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { GetCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { resolveUserId } from './tenant'
import { requireAuth } from './verifyAuth'
import { effectiveStatus, canRespond, type QuoteStatus } from '../../shared/quotes'

// Angebote (Tabelle plexora-quotes, Schlüssel userId = Mandant, quoteId). Der Annahme-Link des Kunden besteht aus quoteId + einem Geheimnis (24 Byte);
// gespeichert wird nur der SHA-256-Hash des Geheimnisses, bei jedem Senden entsteht ein neues (der alte Link verfällt).
export const QUOTES_TABLE = 'plexora-quotes'
export const APP_ORIGIN = 'https://app.plexora.eu'
const sha = (s: string) => createHash('sha256').update(s).digest('hex')

export async function ownerContext(event: any): Promise<{ auth: ReturnType<typeof requireAuth>; tenantId: string }> {
  const auth = requireAuth(event)
  if (!auth.email) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  return { auth, tenantId: await resolveUserId(auth.email) }
}

export async function loadOwnedQuote(event: any): Promise<{ auth: any; tenantId: string; quote: any }> {
  const ctx = await ownerContext(event)
  const id = String(getRouterParam(event, 'id') || '')
  if (!/^[0-9a-f-]{36}$/.test(id)) throw createError({ statusCode: 404, message: 'Angebot nicht gefunden' })
  const quote = (await getDynamoClient().send(new GetCommand({ TableName: QUOTES_TABLE, Key: { userId: ctx.tenantId, quoteId: id } }))).Item
  if (!quote) throw createError({ statusCode: 404, message: 'Angebot nicht gefunden' })
  return { ...ctx, quote }
}

/** Fortlaufende Nummer je Mandant und Jahr (atomarer Zähler in der vorhandenen Zähler-Tabelle, ohne Ablauf) */
export async function nextQuoteSeq(tenantId: string, year: number): Promise<number> {
  const res = await getDynamoClient().send(new UpdateCommand({
    TableName: 'plexora-newsletter-ratelimit', Key: { throttleKey: `quote-seq:${sha(tenantId.toLowerCase()).slice(0, 16)}:${year}` },
    UpdateExpression: 'ADD #c :one', ExpressionAttributeNames: { '#c': 'count' }, ExpressionAttributeValues: { ':one': 1 }, ReturnValues: 'ALL_NEW',
  }))
  return Number(res.Attributes?.count || 1)
}

export const newAcceptSecret = () => randomBytes(24).toString('base64url')
export const hashSecret = sha
export const makeRef = (quoteId: string, secret: string) => `${quoteId}.${secret}`
export function parseRef(ref: unknown): { quoteId: string; secret: string } | null {
  const m = typeof ref === 'string' ? ref.match(/^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{32})$/) : null
  return m ? { quoteId: m[1], secret: m[2] } : null
}
/** Angebot zum Annahme-Link (öffentlich): quoteId suchen, Geheimnis in konstanter Zeit vergleichen. Unbekannt/falsch = null. */
export async function findQuoteByRef(ref: unknown): Promise<any | null> {
  const p = parseRef(ref); if (!p) return null
  const res = await getDynamoClient().send(new ScanCommand({ TableName: QUOTES_TABLE, FilterExpression: 'quoteId = :q', ExpressionAttributeValues: { ':q': p.quoteId } }))
  const q: any = res.Items?.[0]
  if (!q?.acceptHash) return null
  const a = Buffer.from(String(q.acceptHash)), b = Buffer.from(sha(p.secret))
  return a.length === b.length && timingSafeEqual(a, b) ? q : null
}

export async function loadTenantSettings(tenantId: string) {
  const db = getDynamoClient()
  const get = async (settingId: string) => { try { return (await db.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId, scope: tenantId } }))).Item || {} } catch { return {} } }
  const [branding, company, invoice] = await Promise.all([get('branding'), get('company'), get('invoice')])
  return {
    branding: { brandName: 'Plexora', brandTagline: '', primaryColor: '#EA580C', ...branding } as any,
    company: company as any,
    invoiceSettings: { vatRate: 19, smallBusiness: false, ...invoice } as { vatRate: number; smallBusiness: boolean },
  }
}

/** Was der Besitzer sieht: alles außer dem Hash des Annahme-Links; Status mit Ablauf */
export function ownerView(q: any, now = Date.now()) {
  const { acceptHash, ...rest } = q
  return { ...rest, status: effectiveStatus({ status: q.status as QuoteStatus, validUntil: q.validUntil }, now), storedStatus: q.status }
}

/** Was der Kunde unter dem Link sieht: nur das Angebot selbst, nie Besitzer, Mandant oder andere Kunden */
export function publicView(q: any, brand: { name: string; color: string; logo: string }, now = Date.now()) {
  return {
    number: q.number, title: q.title || '', intro: q.intro || '', note: q.note || '', client: q.client,
    items: (q.items || []).map((i: any) => ({ description: i.description, qty: i.qty, price: i.price })),
    net: q.net, vat: q.vat, gross: q.gross, vatRate: q.vatRate, smallBusiness: !!q.smallBusiness,
    validUntil: q.validUntil, status: effectiveStatus({ status: q.status, validUntil: q.validUntil }, now),
    canRespond: canRespond({ status: q.status, validUntil: q.validUntil }, now), respondedAt: q.respondedAt || null,
    brand,
  }
}
