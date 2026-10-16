import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { escapeText } from '../../shared/mailTemplate'
import { sendMail } from './mailer'
import { parseCommentsMode, type CommentsMode } from '../../shared/siteVisitors'

// Besucher-Konten für Unternehmens-Webseiten (Nexora), getrennt von Plexora-Konten: eigene Tabelle, eigener Zugang, nur für Kommentare.
// Tabelle plexora-site-visitors (tenantId, sk): "acct#<email>" Konto, "tok#<hash>" Einmal-Token (Bestätigung/Passwort), "sess#<hash>" Sitzung (ttl = Ablauf, DynamoDB-TTL).
export const VISITORS_TABLE = 'plexora-site-visitors'
export const COMMENTS_TABLE = 'plexora-blog-comments'
const scrypt = promisify(scryptCb) as (pw: string | Buffer, salt: Buffer, keylen: number, opts: object) => Promise<Buffer>
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const nowSec = () => Math.floor(Date.now() / 1000)
export const newToken = () => randomBytes(32).toString('base64url')
export const TTL = { verify: 24 * 3600, reset: 3600, session: 30 * 24 * 3600 }

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16)
  return `s1$${salt.toString('base64')}$${(await scrypt(pw, salt, 64, SCRYPT)).toString('base64')}`
}
// Ein Vergleich mit gleichem Aufwand, auch wenn es das Konto nicht gibt (sonst verrät die Antwortzeit, ob eine Adresse registriert ist)
const DUMMY = 's1$' + Buffer.alloc(16, 1).toString('base64') + '$' + Buffer.alloc(64, 2).toString('base64')
export async function verifyPassword(pw: string, stored: string | undefined): Promise<boolean> {
  const [v, saltB64, hashB64] = String(stored || DUMMY).split('$')
  if (v !== 's1' || !saltB64 || !hashB64) return false
  const expect = Buffer.from(hashB64, 'base64'), got = await scrypt(pw, Buffer.from(saltB64, 'base64'), expect.length, SCRYPT)
  return !!stored && got.length === expect.length && timingSafeEqual(got, expect)
}

/** Webseite des Mandanten laden: muss aktiv sein und einen Blog haben. 404 sonst (einheitlich, verrät nichts über fremde IDs). */
export async function loadSite(tenantId: string): Promise<any> {
  if (!/^[A-Za-z0-9-]{1,64}$/.test(tenantId)) throw createError({ statusCode: 404, message: 'Nicht gefunden' })
  const t = (await getDynamoClient().send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))).Item
  if (!t || t.status !== 'active' || t.blogEnabled === false) throw createError({ statusCode: 404, message: 'Nicht gefunden' })
  return t
}
export const siteCommentsMode = (t: any): CommentsMode => parseCommentsMode(t?.blogCommentsMode)
export const siteOrigin = (t: any) => (t?.customDomain && /^[a-z0-9.-]+$/i.test(t.customDomain) ? `https://${t.customDomain}` : 'https://nexora-nuxt.pages.dev')

const db = () => getDynamoClient()
export const acctKey = (tenantId: string, email: string) => ({ tenantId, sk: `acct#${email}` })
export async function getAccount(tenantId: string, email: string): Promise<any | undefined> { return (await db().send(new GetCommand({ TableName: VISITORS_TABLE, Key: acctKey(tenantId, email) }))).Item }

export async function createToken(tenantId: string, kind: 'verify' | 'reset', email: string): Promise<string> {
  const raw = newToken()
  await db().send(new PutCommand({ TableName: VISITORS_TABLE, Item: { tenantId, sk: `tok#${sha(raw)}`, kind, email, ttl: nowSec() + TTL[kind] } }))
  return raw
}
/** Einmal-Token einlösen: genau einmal gültig (atomar), nur für die richtige Art und solange nicht abgelaufen */
export async function consumeToken(tenantId: string, raw: unknown, kind: 'verify' | 'reset'): Promise<string | null> {
  if (typeof raw !== 'string' || raw.length < 20 || raw.length > 100) return null
  try {
    const res = await db().send(new DeleteCommand({ TableName: VISITORS_TABLE, Key: { tenantId, sk: `tok#${sha(raw)}` }, ConditionExpression: 'attribute_exists(sk)', ReturnValues: 'ALL_OLD' }))
    const it = res.Attributes
    return it && it.kind === kind && Number(it.ttl) > nowSec() ? String(it.email) : null
  } catch (e: any) { if (e?.name === 'ConditionalCheckFailedException') return null; throw e }
}
export async function createSession(tenantId: string, email: string, ver: number): Promise<string> {
  const raw = newToken()
  await db().send(new PutCommand({ TableName: VISITORS_TABLE, Item: { tenantId, sk: `sess#${sha(raw)}`, email, ver, ttl: nowSec() + TTL.session } }))
  return raw
}
/** Angemeldeter Besucher aus dem Token der Anfrage (oder 401). Prüft Ablauf, Konto und Sitzungsversion (ein Passwortwechsel beendet alte Sitzungen). */
export async function requireVisitor(rawToken: unknown, tenantId: string): Promise<{ email: string; name: string; sessionSk: string }> {
  const fail = () => createError({ statusCode: 401, message: 'Bitte anmelden.' })
  const raw = typeof rawToken === 'string' ? rawToken.trim() : ''
  if (raw.length < 20 || raw.length > 100) throw fail()
  const sk = `sess#${sha(raw)}`
  const s = (await db().send(new GetCommand({ TableName: VISITORS_TABLE, Key: { tenantId, sk } }))).Item
  if (!s || Number(s.ttl) <= nowSec()) throw fail()
  const a = await getAccount(tenantId, String(s.email))
  if (!a || !a.verified || Number(a.sessVer || 1) !== Number(s.ver)) throw fail()
  return { email: a.email, name: a.name, sessionSk: sk }
}

/** Konto samt Kommentaren löschen (Recht auf Löschung) */
export async function deleteAccountAndComments(tenantId: string, email: string): Promise<number> {
  const rows = (await db().send(new QueryCommand({ TableName: COMMENTS_TABLE, KeyConditionExpression: 'tenantId = :t', FilterExpression: 'authorEmail = :e', ExpressionAttributeValues: { ':t': tenantId, ':e': email } }))).Items || []
  for (const r of rows) await db().send(new DeleteCommand({ TableName: COMMENTS_TABLE, Key: { tenantId, commentId: r.commentId } }))
  await db().send(new DeleteCommand({ TableName: VISITORS_TABLE, Key: acctKey(tenantId, email) }))
  return rows.length
}

export async function sendVisitorMail(site: any, to: string, subject: string, intro: string, buttonText: string, url: string) {
  const company = escapeText(site.companyName || 'Unsere Webseite')
  const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1e2a3a"><h2 style="margin:0 0 12px">${company}</h2><p>${escapeText(intro)}</p><p style="margin:24px 0"><a href="${escapeText(url)}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${escapeText(buttonText)}</a></p><p style="font-size:12px;color:#666">Funktioniert der Knopf nicht? Diese Adresse in den Browser kopieren:<br>${escapeText(url)}</p><p style="font-size:12px;color:#666">Wenn du das nicht angefordert hast, kannst du diese Mail ignorieren.</p></div>`
  const text = `${intro}\n\n${buttonText}: ${url}\n\nWenn du das nicht angefordert hast, kannst du diese Mail ignorieren.`
  return sendMail({ userId: String(site.email || site.tenantId), kind: 'visitor_account', from: `${String(site.companyName || 'Webseite').replace(/[<>"\r\n]/g, '')} <noreply@plexora.eu>`, to, subject, html, text })
}
