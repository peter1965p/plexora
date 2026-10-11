// Angebote: reine Logik für Server und Oberfläche (Prüfung der Eingaben, Summen, Statuswechsel, Gültigkeit). Keine Datenbank, kein Netz.
export const QUOTE_STATUS = ['draft', 'sent', 'accepted', 'declined', 'expired'] as const
export type QuoteStatus = typeof QUOTE_STATUS[number]
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = { draft: 'Entwurf', sent: 'Gesendet', accepted: 'Angenommen', declined: 'Abgelehnt', expired: 'Abgelaufen' }

export interface QuoteItem { description: string; qty: number; price: number }
export interface QuoteInput {
  client: string; clientEmail: string; clientAddress: string
  title: string; intro: string; note: string
  items: QuoteItem[]
  /** Gültig bis (JJJJ-MM-TT) */
  validUntil: string
}
export const LIMITS = { client: 120, email: 254, address: 300, title: 120, intro: 1500, note: 1500, itemDescription: 300, items: 50, qtyMax: 100000, priceMax: 10_000_000 }

const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '')
const EMAIL_RE = /^[^\s@,;<>"'()\\]+@[^\s@,;<>"'()\\]+\.[^\s@,;<>"'()\\]+$/
export const isIsoDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + 'T00:00:00Z').getTime()) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s

export const addDays = (iso: string, days: number) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }
export const todayIso = (now = Date.now()) => new Date(now).toISOString().slice(0, 10)

export class QuoteError extends Error { constructor(message: string) { super(message) } }

/** Prüft und bereinigt die Eingabe eines Angebots (Entwurf oder Änderung). Wirft QuoteError mit verständlicher Meldung. */
export function parseQuoteInput(raw: any, now = Date.now()): QuoteInput {
  const b = raw && typeof raw === 'object' ? raw : {}
  const client = clean(b.client, LIMITS.client)
  if (!client) throw new QuoteError('Bitte den Kunden angeben.')
  const clientEmail = clean(b.clientEmail, LIMITS.email).toLowerCase()
  if (clientEmail && !EMAIL_RE.test(clientEmail)) throw new QuoteError('Die E-Mail-Adresse des Kunden ist ungültig.')
  if (!Array.isArray(b.items) || b.items.length === 0) throw new QuoteError('Bitte mindestens eine Position angeben.')
  if (b.items.length > LIMITS.items) throw new QuoteError(`Höchstens ${LIMITS.items} Positionen.`)
  const items: QuoteItem[] = b.items.map((i: any, n: number) => {
    const description = clean(i?.description, LIMITS.itemDescription)
    const qty = Number(i?.qty), price = Number(i?.price)
    if (!description) throw new QuoteError(`Position ${n + 1}: Bitte eine Beschreibung angeben.`)
    if (!Number.isFinite(qty) || qty <= 0 || qty > LIMITS.qtyMax) throw new QuoteError(`Position ${n + 1}: Menge ungültig.`)
    if (!Number.isFinite(price) || price < 0 || price > LIMITS.priceMax) throw new QuoteError(`Position ${n + 1}: Preis ungültig.`)
    return { description, qty: Math.round(qty * 1000) / 1000, price: Math.round(price * 100) / 100 }
  })
  let validUntil = b.validUntil === undefined || b.validUntil === '' ? addDays(todayIso(now), 14) : b.validUntil
  if (!isIsoDate(validUntil)) throw new QuoteError('„Gültig bis" ist kein gültiges Datum.')
  if (validUntil < todayIso(now)) throw new QuoteError('„Gültig bis" liegt in der Vergangenheit.')
  return { client, clientEmail, clientAddress: clean(b.clientAddress, LIMITS.address), title: clean(b.title, LIMITS.title), intro: clean(b.intro, LIMITS.intro), note: clean(b.note, LIMITS.note), items, validUntil }
}

export const round2 = (n: number) => Math.round(n * 100) / 100
export function totals(items: QuoteItem[], vatRate = 19, smallBusiness = false) {
  const net = round2(items.reduce((s, i) => s + i.qty * i.price, 0))
  const vat = smallBusiness ? 0 : round2(net * (vatRate / 100))
  return { net, vat, gross: round2(net + vat) }
}

/** Erlaubte Statuswechsel. Ein Entwurf wird nur durch Senden "gesendet"; Annehmen/Ablehnen/Ablaufen nur aus "gesendet"; abgeschlossene Zustände sind endgültig. */
const NEXT: Record<QuoteStatus, QuoteStatus[]> = { draft: ['sent'], sent: ['accepted', 'declined', 'expired'], accepted: [], declined: [], expired: ['sent'] }
export const canTransition = (from: QuoteStatus, to: QuoteStatus) => NEXT[from]?.includes(to) ?? false
export const isQuoteStatus = (s: unknown): s is QuoteStatus => typeof s === 'string' && (QUOTE_STATUS as readonly string[]).includes(s)

/** Effektiver Status: ein gesendetes Angebot nach Ablauf der Gültigkeit gilt als abgelaufen (ohne dass jemand es speichern muss) */
export function effectiveStatus(q: { status: QuoteStatus; validUntil: string }, now = Date.now()): QuoteStatus {
  return q.status === 'sent' && q.validUntil < todayIso(now) ? 'expired' : q.status
}
/** Darf der Kunde jetzt online annehmen/ablehnen? */
export const canRespond = (q: { status: QuoteStatus; validUntil: string }, now = Date.now()) => effectiveStatus(q, now) === 'sent'

export const quoteNumber = (year: number, seq: number) => `AN-${year}-${String(seq).padStart(3, '0')}`

/** Kampagnen-Einstellung "bei Anfrage automatisch Angebot-Entwurf anlegen". Immer bereinigt; ohne gültiges Paket ist sie aus. */
export interface AutoQuoteConfig { enabled: boolean; title: string; description: string; price: number; validDays: number; intro: string; promoUntil: string }
export function parseAutoQuote(raw: any): AutoQuoteConfig {
  const b = raw && typeof raw === 'object' ? raw : {}
  const price = Number(b.price)
  const description = clean(b.description, LIMITS.itemDescription)
  const promoUntil = isIsoDate(b.promoUntil) ? b.promoUntil : ''
  const validDays = Number.isFinite(Number(b.validDays)) ? Math.min(90, Math.max(1, Math.round(Number(b.validDays)))) : 14
  const ok = b.enabled === true && !!description && Number.isFinite(price) && price >= 0 && price <= LIMITS.priceMax
  return { enabled: ok, title: clean(b.title, LIMITS.title), description, price: Number.isFinite(price) ? Math.round(price * 100) / 100 : 0, validDays, intro: clean(b.intro, LIMITS.intro), promoUntil }
}
/** Gültig bis für ein automatisches Angebot: Gültigkeitsdauer, aber nie über das Aktionsende hinaus (und nie in der Vergangenheit) */
export function autoQuoteValidUntil(cfg: AutoQuoteConfig, now = Date.now()): string {
  const base = addDays(todayIso(now), cfg.validDays)
  return cfg.promoUntil && cfg.promoUntil >= todayIso(now) && cfg.promoUntil < base ? cfg.promoUntil : base
}
