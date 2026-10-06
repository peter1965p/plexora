// Einzige Quelle für Vertrauenspunkte, Datenschutzzeile und Overlays (Sticker) der Lead-Seite.
// Genutzt von: Lead-Seite (app/pages/lead/[slug].vue), Editor, Vorschau, den Freigestalt-Templates
// (server/utils/campaignTemplate.ts, app/utils/campaignTemplateClient.ts, server/utils/campaignPresets/lead/standard.ts) und dem Server (Prüfung beim Speichern, Bereinigung der öffentlichen Ausgabe).
// Grundsätze: Texte sind immer reiner Text (nie HTML); Icons und Formen sind IDs aus einer festen Liste (keine freien SVGs, keine Uploads);
// Längen und Anzahl sind begrenzt; Farben nur als Hex. Es gibt bewusst KEINE vorgefertigten Dringlichkeits- oder Superlativ-Texte.

export const MAX_TRUST_ITEMS = 8
export const MAX_TRUST_TEXT = 60
export const MAX_PRIVACY_TEXT = 120
export const MAX_OVERLAYS = 8
export const MAX_OVERLAY_TEXT = 24
export const MAX_ANIMATED_OVERLAYS = 2

/** Icon-ID -> Tabler-Klasse. Nur diese Icons sind wählbar. */
export const TRUST_ICONS: Record<string, string> = {
  'shield-check': 'ti-shield-check', lock: 'ti-lock', clock: 'ti-clock', check: 'ti-check', 'circle-check': 'ti-circle-check', star: 'ti-star', heart: 'ti-heart',
  'thumb-up': 'ti-thumb-up', award: 'ti-award', 'shield-lock': 'ti-shield-lock', mail: 'ti-mail', phone: 'ti-phone', calendar: 'ti-calendar', gift: 'ti-gift',
  rocket: 'ti-rocket', 'user-check': 'ti-user-check', 'credit-card-off': 'ti-credit-card-off', truck: 'ti-truck-delivery', sparkles: 'ti-sparkles', bolt: 'ti-bolt',
}
export const TRUST_ICON_LABELS: Record<string, string> = {
  'shield-check': 'Schild mit Haken', lock: 'Schloss', clock: 'Uhr', check: 'Haken', 'circle-check': 'Haken im Kreis', star: 'Stern', heart: 'Herz', 'thumb-up': 'Daumen hoch',
  award: 'Auszeichnung', 'shield-lock': 'Schild mit Schloss', mail: 'Brief', phone: 'Telefon', calendar: 'Kalender', gift: 'Geschenk', rocket: 'Rakete', 'user-check': 'Person mit Haken',
  'credit-card-off': 'Keine Kosten', truck: 'Lieferung', sparkles: 'Funken', bolt: 'Blitz',
}

/** Overlay-Formen (die Zeichnung steckt in app/utils/leadShapes.ts, hier nur IDs und Namen). */
export const OVERLAY_SHAPES: Record<string, string> = {
  star: 'Stern', burst: 'Explosion / Smash', bolt: 'Blitz', flame: 'Flamme', arrow: 'Pfeil', percent: 'Prozent-Badge', check: 'Haken',
  heart: 'Herz', 'thumbs-up': 'Daumen hoch', crown: 'Krone', gift: 'Geschenk', rocket: 'Rakete', ribbon: 'Band',
}
export const OVERLAY_ANIMATIONS: Record<string, string> = { none: 'keine', pulse: 'pulsieren', wiggle: 'wackeln', spin: 'langsam drehen' }

export interface TrustItem { id: string; on: boolean; icon: string; text: string }
export interface PrivacyLine { on: boolean; text: string }
export interface Overlay { id: string; on: boolean; shape: string; text: string; color: string; size: number; rotate: number; x: number; y: number; anim: string }

// ── Standardwerte (damit bestehende Kampagnen unverändert aussehen) ──
export const DEFAULT_TRUST_ITEMS: readonly TrustItem[] = Object.freeze([
  { id: 't1', on: true, icon: 'shield-check', text: 'Anfrage 100 % kostenlos' },
  { id: 't2', on: true, icon: 'lock', text: 'SSL gesichert' },
  { id: 't3', on: true, icon: 'clock', text: 'Antwort in 24 h' },
])
export const DEFAULT_PRIVACY_LINE: Readonly<PrivacyLine> = Object.freeze({ on: true, text: 'Deine Daten werden vertraulich behandelt.' })
export const DEFAULT_OVERLAY_COLOR = '#f59e0b'
export const DEFAULT_OVERLAY: Omit<Overlay, 'id'> = { on: true, shape: 'star', text: '', color: DEFAULT_OVERLAY_COLOR, size: 22, rotate: 0, x: 70, y: 8, anim: 'none' }

// ── Bereinigung einzelner Werte ──
const clean = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
const HEX = /^#[0-9a-fA-F]{6}$/
const num = (v: unknown, min: number, max: number, dflt: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : dflt }
const safeId = (v: unknown, fallback: string) => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,24}$/.test(v) ? v : fallback)

export function sanitizeTrustItem(raw: any, i: number): TrustItem | null {
  const text = clean(raw?.text, MAX_TRUST_TEXT)
  if (!text) return null
  return { id: safeId(raw?.id, `t${i + 1}`), on: raw?.on !== false, icon: typeof raw?.icon === 'string' && raw.icon in TRUST_ICONS ? raw.icon : 'check', text }
}
export function sanitizeOverlay(raw: any, i: number): Overlay {
  return {
    id: safeId(raw?.id, `o${i + 1}`), on: raw?.on !== false,
    shape: typeof raw?.shape === 'string' && raw.shape in OVERLAY_SHAPES ? raw.shape : 'star',
    text: clean(raw?.text, MAX_OVERLAY_TEXT),
    color: typeof raw?.color === 'string' && HEX.test(raw.color) ? raw.color : DEFAULT_OVERLAY_COLOR,
    size: Math.round(num(raw?.size, 8, 40, DEFAULT_OVERLAY.size)), rotate: Math.round(num(raw?.rotate, -180, 180, 0)),
    x: Math.round(num(raw?.x, 0, 92, DEFAULT_OVERLAY.x)), y: Math.round(num(raw?.y, 0, 92, DEFAULT_OVERLAY.y)),
    anim: typeof raw?.anim === 'string' && raw.anim in OVERLAY_ANIMATIONS ? raw.anim : 'none',
  }
}

// ── Lesen (öffentliche Ausgabe, Seite, Vorschau): nie Fehler, nie unsichere Werte; fehlendes Feld = Standard ──
export function resolveTrustItems(stored: unknown): TrustItem[] {
  if (!Array.isArray(stored)) return DEFAULT_TRUST_ITEMS.map(t => ({ ...t }))
  return stored.slice(0, MAX_TRUST_ITEMS).map((r, i) => sanitizeTrustItem(r, i)).filter((x): x is TrustItem => !!x)
}
export function resolvePrivacyLine(stored: unknown): PrivacyLine {
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_PRIVACY_LINE }
  const s = stored as any
  return { on: s.on !== false, text: clean(s.text, MAX_PRIVACY_TEXT) || DEFAULT_PRIVACY_LINE.text }
}
export function resolveOverlays(stored: unknown): Overlay[] {
  if (!Array.isArray(stored)) return []
  let animated = 0
  return stored.slice(0, MAX_OVERLAYS).map((r, i) => sanitizeOverlay(r, i)).map(o => {
    if (o.anim !== 'none' && o.on) { if (++animated > MAX_ANIMATED_OVERLAYS) return { ...o, anim: 'none' } }
    return o
  })
}

// ── Schreiben (Speichern in der Kampagne): strenge Prüfung mit verständlichen Fehlermeldungen ──
export type Validated<T> = { ok: true; value: T } | { ok: false; error: string }
export function validateTrustItems(input: unknown): Validated<TrustItem[]> {
  if (!Array.isArray(input)) return { ok: false, error: 'Vertrauenspunkte müssen eine Liste sein.' }
  if (input.length > MAX_TRUST_ITEMS) return { ok: false, error: `Höchstens ${MAX_TRUST_ITEMS} Vertrauenspunkte.` }
  const out: TrustItem[] = []
  for (let i = 0; i < input.length; i++) {
    const r: any = input[i]
    if (String(r?.text ?? '').trim().length > MAX_TRUST_TEXT) return { ok: false, error: `Vertrauenspunkt ${i + 1}: höchstens ${MAX_TRUST_TEXT} Zeichen.` }
    if (r?.icon !== undefined && !(typeof r.icon === 'string' && r.icon in TRUST_ICONS)) return { ok: false, error: `Vertrauenspunkt ${i + 1}: unbekanntes Symbol.` }
    const item = sanitizeTrustItem(r, i)
    if (!item) return { ok: false, error: `Vertrauenspunkt ${i + 1}: Text fehlt.` }
    out.push(item)
  }
  return { ok: true, value: out }
}
export function validatePrivacyLine(input: unknown): Validated<PrivacyLine> {
  if (!input || typeof input !== 'object') return { ok: false, error: 'Datenschutzzeile ungültig.' }
  const s = input as any
  if (String(s.text ?? '').trim().length > MAX_PRIVACY_TEXT) return { ok: false, error: `Datenschutzzeile: höchstens ${MAX_PRIVACY_TEXT} Zeichen.` }
  const text = clean(s.text, MAX_PRIVACY_TEXT)
  if (s.on !== false && !text) return { ok: false, error: 'Datenschutzzeile: Text fehlt (oder Schalter ausschalten).' }
  return { ok: true, value: { on: s.on !== false, text: text || DEFAULT_PRIVACY_LINE.text } }
}
export function validateOverlays(input: unknown): Validated<Overlay[]> {
  if (!Array.isArray(input)) return { ok: false, error: 'Overlays müssen eine Liste sein.' }
  if (input.length > MAX_OVERLAYS) return { ok: false, error: `Höchstens ${MAX_OVERLAYS} Overlays.` }
  const out: Overlay[] = []
  for (let i = 0; i < input.length; i++) {
    const r: any = input[i]
    if (r?.shape !== undefined && !(typeof r.shape === 'string' && r.shape in OVERLAY_SHAPES)) return { ok: false, error: `Overlay ${i + 1}: unbekannte Form.` }
    if (String(r?.text ?? '').trim().length > MAX_OVERLAY_TEXT) return { ok: false, error: `Overlay ${i + 1}: Text höchstens ${MAX_OVERLAY_TEXT} Zeichen.` }
    if (r?.color !== undefined && !(typeof r.color === 'string' && HEX.test(r.color))) return { ok: false, error: `Overlay ${i + 1}: Farbe muss ein Hex-Wert wie #f59e0b sein.` }
    if (r?.anim !== undefined && !(typeof r.anim === 'string' && r.anim in OVERLAY_ANIMATIONS)) return { ok: false, error: `Overlay ${i + 1}: unbekannte Animation.` }
    out.push(sanitizeOverlay(r, i))
  }
  if (out.filter(o => o.anim !== 'none').length > MAX_ANIMATED_OVERLAYS) return { ok: false, error: `Höchstens ${MAX_ANIMATED_OVERLAYS} animierte Overlays.` }
  return { ok: true, value: out }
}

// ── HTML für die Freigestalt-Templates (Handlebars {{{trust_html}}}); alle Texte werden maskiert, Icons nur aus der Allowlist ──
export const escapeHtml = (s: unknown) => String(s ?? '').replace(/[&<>"'`=\/]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;', '=': '&#61;', '/': '&#47;' } as Record<string, string>)[c])
export function trustItemsHtml(items: unknown): string {
  const list = resolveTrustItems(items).filter(t => t.on)
  if (!list.length) return ''
  return `<div class="lp-trust">${list.map(t => `<div class="lp-trust-item"><i class="ti ${TRUST_ICONS[t.icon]}"></i> ${escapeHtml(t.text)}</div>`).join('')}</div>`
}
export function privacyLineHtml(line: unknown): string {
  const p = resolvePrivacyLine(line)
  return p.on ? `<div class="plx-privacy"><i class="ti ti-lock"></i> ${escapeHtml(p.text)}</div>` : ''
}
