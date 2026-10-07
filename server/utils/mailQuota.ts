import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { createHash } from 'node:crypto'
import { getDynamoClient } from './dynamodb'
import { resolvePlanForTenant, planEnforced } from './tenantPlan'
import { PLAN_LIMITS, PLAN_LABELS } from '../../shared/plans'

// Ein Zählpunkt für alle Mails eines Mandanten ("Tageslimit"). Zwei Töpfe, damit Systemmails nie am Marketing-Limit scheitern:
//   system = Bestätigungen, Rechnungen, Einladungen, Mahnungen, Termin-Mails   bulk = Kampagnen, Newsletter, Follow-ups
// Zähler: vorhandene Tabelle plexora-newsletter-ratelimit (Schlüssel mail:<Topf>:<Mandant-Hash>:<Tag>), also ohne neue Tabelle und ohne neue AWS-Rechte.
// Massenversand reserviert vorab die GANZE Empfängerzahl: entweder geht alles oder nichts, nie "halb gesendet".
// Beobachtungsmodus (NUXT_PLAN_ENFORCE nicht "true"): es wird gezählt und "würde ablehnen" protokolliert, aber nichts verweigert.

export type MailPool = 'system' | 'bulk'
const DAY = 86400
const h = (s: string) => createHash('sha256').update(s.trim().toLowerCase()).digest('hex').slice(0, 16)

export interface MailQuotaInput { tenantId: string; pool: MailPool; /** Empfängeradressen (für "Free nur an die eigene Adresse" und je Empfänger) */ recipients?: string[]; /** Anzahl Mails, wenn die Adressen nicht einzeln vorliegen (Massenversand) */ count?: number; what?: string }
export interface MailQuotaResult { ok: boolean; reason?: 'daily' | 'recipient' | 'free-recipient' | 'bulk-not-allowed' | 'plan-unknown'; limit?: number; used?: number; message?: string }

async function bump(key: string, by: number): Promise<number> {
  const res = await getDynamoClient().send(new UpdateCommand({
    TableName: 'plexora-newsletter-ratelimit', Key: { throttleKey: key },
    UpdateExpression: 'ADD #c :n SET #t = :ttl', ExpressionAttributeNames: { '#c': 'count', '#t': 'ttl' },
    ExpressionAttributeValues: { ':n': by, ':ttl': (Math.floor(Date.now() / 1000 / DAY) + 1) * DAY + 3600 }, ReturnValues: 'ALL_NEW',
  }))
  return Number(res.Attributes?.count || 0)
}

async function decide(i: MailQuotaInput): Promise<MailQuotaResult & { plan?: string }> {
  const info = await resolvePlanForTenant(i.tenantId)
  if (info.exempt) return { ok: true }
  const lim = PLAN_LIMITS[info.plan], label = PLAN_LABELS[info.plan]
  const rcpts = (i.recipients || []).map(r => r.trim().toLowerCase()).filter(Boolean)
  const n = i.count ?? Math.max(1, rcpts.length)
  const max = i.pool === 'bulk' ? lim.mailBulkPerDay : lim.mailSystemPerDay
  if (max === 0) return { ok: false, reason: 'bulk-not-allowed', limit: 0, plan: info.plan, message: `Massen-E-Mails sind im Tarif ${label} nicht enthalten. Mit einer Lizenz sind es bis zu ${PLAN_LIMITS.starter.mailBulkPerDay} pro Tag.` }
  // Free: Systemmails nur an die eigene Adresse (kein Spam-Relay über die Plattform-Domain)
  if (info.plan === 'free' && i.pool === 'system' && rcpts.some(r => r !== i.tenantId.trim().toLowerCase())) {
    return { ok: false, reason: 'free-recipient', plan: info.plan, message: `Im Tarif ${label} sind E-Mails nur an deine eigene Adresse möglich.` }
  }
  const day = Math.floor(Date.now() / 1000 / DAY)
  const dKey = `mail:${i.pool}:${h(i.tenantId)}:${day}`
  const used = await bump(dKey, n)
  if (used > max) {
    await bump(dKey, -n).catch(() => {})
    const left = Math.max(0, max - (used - n))
    return { ok: false, reason: 'daily', limit: max, used: used - n, plan: info.plan, message: `Heute sind noch ${left} von ${max} E-Mails möglich, hier wären es ${n}. Morgen geht es weiter.` }
  }
  // Je Empfänger höchstens 3 Mails pro Tag aus einem Mandanten (Schutz vor Belästigung); bei Massenversand an viele Adressen nicht einzeln gezählt
  if (rcpts.length > 0 && rcpts.length <= 5) {
    for (const r of rcpts) {
      const c = await bump(`mailrcpt:${h(i.tenantId + '|' + r)}:${day}`, 1)
      if (c > lim.mailPerRecipientPerDay) { await bump(dKey, -n).catch(() => {}); return { ok: false, reason: 'recipient', limit: lim.mailPerRecipientPerDay, plan: info.plan, message: `An dieselbe Adresse sind höchstens ${lim.mailPerRecipientPerDay} E-Mails pro Tag möglich.` } }
    }
  }
  return { ok: true }
}

/**
 * Darf der Mandant diese Mail(s) jetzt senden? Zählt mit. Im Beobachtungsmodus ist die Antwort immer ok (es wird nur protokolliert).
 * Fällt die Prüfung selbst aus: scharf nicht senden (fail-closed für Mengen, nicht für Systemzugriffe), sonst durchlassen.
 */
export async function reserveMail(i: MailQuotaInput): Promise<MailQuotaResult> {
  const enforce = planEnforced()
  let r: MailQuotaResult & { plan?: string }
  try { r = await decide(i) } catch (e) {
    console.error('[mail-quota] Prüfung nicht möglich:', (e as Error)?.message)
    return enforce ? { ok: false, reason: 'plan-unknown', message: 'Das Mail-Limit konnte gerade nicht geprüft werden. Bitte gleich noch einmal versuchen.' } : { ok: true }
  }
  if (r.ok) return r
  console.warn(`[plan] ${enforce ? 'abgelehnt' : 'würde ablehnen'} ${JSON.stringify({ what: i.what || 'mail', pool: i.pool, reason: r.reason, plan: r.plan, limit: r.limit, used: r.used, count: i.count ?? i.recipients?.length ?? 1, tenant: h(i.tenantId).slice(0, 8) })}`)
  return enforce ? r : { ok: true }
}

/** Für Aktionen, die ein angemeldeter Nutzer auslöst (Kampagne senden, Mahnung, Einladung): bei Überschreitung 429 mit verständlicher Meldung */
export async function assertMailQuota(i: MailQuotaInput): Promise<void> {
  const r = await reserveMail(i)
  if (!r.ok) throw createError({ statusCode: r.reason === 'bulk-not-allowed' || r.reason === 'free-recipient' ? 402 : r.reason === 'plan-unknown' ? 503 : 429, message: r.message || 'Mail-Limit erreicht.', data: { code: r.reason === 'bulk-not-allowed' || r.reason === 'free-recipient' ? 'PLAN_REQUIRED' : 'MAIL_LIMIT', reason: r.reason, limit: r.limit, used: r.used } })
}
