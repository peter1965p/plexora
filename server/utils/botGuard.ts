import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { resolveUserId } from './tenant'
import { clientIp } from './rateLimit'
import { siteverify, TurnstileUnavailable } from './turnstile'
import { getBotSettings, hasKeys, readSecret, DEFAULT_HOSTNAMES } from './botProtection'

// Prüfung des Turnstile-Tokens auf öffentlichen Formular-Routen.
// Ob geprüft wird, entscheidet allein der Server aus gespeicherten Einstellungen (Kampagne / Kontaktseite),
// nie ein Wert aus dem Request. Das Token selbst kommt im Body als `turnstileToken`.

const TOKEN_MISSING = 'Bitte bestätigen Sie die Sicherheitsprüfung („Ich bin kein Roboter“) und senden Sie das Formular erneut.'
const TOKEN_REJECTED = 'Die Sicherheitsprüfung ist fehlgeschlagen oder abgelaufen. Bitte laden Sie die Seite neu und versuchen Sie es erneut.'
const TEMP_UNAVAILABLE = 'Die Sicherheitsprüfung ist gerade nicht erreichbar. Bitte versuchen Sie es später erneut.'

// Erlaubte Seiten: Plattform, eigene Liste und die Domain des Mandanten (mit/ohne www)
export function allowedHostnames(custom: string[], tenantDomain?: string): string[] {
  const list = new Set<string>([...DEFAULT_HOSTNAMES, ...custom.map(h => h.toLowerCase())])
  const d = (tenantDomain || '').toLowerCase().trim()
  if (d) { list.add(d); list.add(d.startsWith('www.') ? d.slice(4) : `www.${d}`) }
  return [...list]
}

/**
 * Prüft das Token, sofern der Hauptschalter des Inhabers an ist.
 * 403: Token fehlt/ungültig/falsche Seite · 503: Cloudflare oder Schlüssel nicht verfügbar (geschlossen, geloggt).
 */
export async function verifyBotToken(event: any, ownerScope: string, token: unknown, tenantDomain?: string): Promise<void> {
  const settings = await getBotSettings(ownerScope)
  if (!settings.enabled) return                       // Hauptschalter aus: Schutz ruht

  if (!hasKeys(settings)) {
    console.error('[turnstile] Schutz aktiv, aber Schlüssel fehlen – Anfrage abgewiesen', ownerScope)
    throw createError({ statusCode: 503, message: TEMP_UNAVAILABLE })
  }
  const t = typeof token === 'string' ? token.trim() : ''
  if (!t || t.length > 2048) throw createError({ statusCode: 403, message: TOKEN_MISSING })

  let secret: string
  try { secret = readSecret(settings) } catch (e) {
    console.error('[turnstile] Secret nicht entschlüsselbar', ownerScope, (e as Error)?.message)
    throw createError({ statusCode: 503, message: TEMP_UNAVAILABLE })
  }

  let result
  try {
    result = await siteverify(secret, t, clientIp(event))
  } catch (e) {
    if (e instanceof TurnstileUnavailable) {
      console.error('[turnstile] Cloudflare nicht erreichbar – Anfrage geschlossen abgewiesen', ownerScope, e.message)
      throw createError({ statusCode: 503, message: TEMP_UNAVAILABLE })
    }
    throw e
  }
  if (!result.success) {
    console.warn('[turnstile] Token abgelehnt', ownerScope, result.errorCodes.join(','))
    throw createError({ statusCode: 403, message: TOKEN_REJECTED })
  }
  if (!allowedHostnames(settings.hostnames, tenantDomain).includes(result.hostname)) {
    console.warn('[turnstile] Token von fremder Seite', ownerScope, result.hostname)
    throw createError({ statusCode: 403, message: TOKEN_REJECTED })
  }
}

// ── Entscheidungen des Servers (nur aus gespeicherten Daten) ───────────────────────────────────

// Ein Formular gilt als geschützt, sobald irgendeine Kampagne des Inhabers mit diesem Formular den Schalter an hat.
// Ein direkter Aufruf der Formular-Route ohne Kampagne umgeht den Schutz damit nicht.
export async function formIsProtected(ownerScope: string, formId: string): Promise<boolean> {
  if (!ownerScope || !formId) return false
  const res = await getDynamoClient().send(new QueryCommand({
    TableName: 'plexora-marketing',
    KeyConditionExpression: 'userId = :u',
    FilterExpression: 'formId = :f AND turnstileEnabled = :t',
    ExpressionAttributeValues: { ':u': ownerScope, ':f': formId, ':t': true },
    Select: 'COUNT',
  }))
  return (res.Count || 0) > 0
}

// Kampagnen-Terminart (campaignId gesetzt): geschützt, wenn ihre Kampagne den Schalter an hat
export async function campaignTypeIsProtected(ownerEmail: string, campaignId: string): Promise<{ protected: boolean; ownerScope: string }> {
  const ownerScope = await resolveUserId(ownerEmail)
  if (!campaignId) return { protected: false, ownerScope }
  const res = await getDynamoClient().send(new QueryCommand({
    TableName: 'plexora-marketing',
    KeyConditionExpression: 'userId = :u AND campaignId = :c',
    FilterExpression: 'turnstileEnabled = :t',
    ExpressionAttributeValues: { ':u': ownerScope, ':c': campaignId, ':t': true },
    Select: 'COUNT',
  }))
  return { protected: (res.Count || 0) > 0, ownerScope }
}

export async function contactIsProtected(ownerEmail: string): Promise<{ protected: boolean; ownerScope: string }> {
  const ownerScope = await resolveUserId(ownerEmail)
  const s = await getBotSettings(ownerScope)
  return { protected: s.contactProtection, ownerScope }
}

// Widget-Daten für die öffentliche Seite: nur Sitekey und Modus (nie das Secret). null = kein Widget anzeigen.
// Spiegelt die Entscheidung des Servers: Widget nur, wenn der Hauptschalter an ist, Schlüssel da sind und der Schutz greift.
export async function widgetConfig(ownerScope: string, protectedHere: boolean): Promise<{ siteKey: string; mode: string } | null> {
  if (!protectedHere || !ownerScope) return null
  const s = await getBotSettings(ownerScope)
  if (!s.enabled || !hasKeys(s)) return null
  return { siteKey: s.siteKey, mode: s.mode }
}

// Schalter „Bot-Schutz aktiv“ an einer Kampagne: einschalten nur, wenn der Inhaber Sitekey und Secret hinterlegt hat.
export async function assertBotProtectionAllowed(ownerScope: string, wanted: unknown): Promise<boolean> {
  if (wanted !== true) return false
  if (!hasKeys(await getBotSettings(ownerScope))) {
    throw createError({ statusCode: 400, message: 'Bot-Schutz lässt sich erst aktivieren, wenn unter Einstellungen → Bot-Schutz Sitekey und Secret hinterlegt sind.' })
  }
  return true
}
