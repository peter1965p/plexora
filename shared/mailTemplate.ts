// Gemeinsamer Mail-Baustein (Server UND Editor-Vorschau): Konfiguration, Prüfung, Kontrast, Platzhalter und die Darstellung als HTML und Klartext.
// Reine Funktionen ohne Abhängigkeiten, damit die Vorschau im Browser exakt das erzeugt, was der Server versendet.
//
// Sicherheitsgrundsätze:
//  - Nutzertexte sind nur reiner Text und werden beim Ausgeben maskiert (kein HTML, keine eigenen Links).
//  - Farben nur als Hex, Schriften nur aus einer Liste, Zahlen in Grenzen. Es gibt kein CSS-Freitext; style-Attribute entstehen nur aus geprüften Werten.
//  - Das Ziel des Buttons ist IMMER der vom Server erzeugte Annahme-Link (renderInviteMail verlangt ihn und prüft sein Format), nie ein Konfigurationswert.
//  - Der Sicherheitsteil (Klartext-Link, Absender-/Empfängerzeile, Missbrauchshinweis) ist fest, nicht abschaltbar und hat eigene Farben.

export const PRODUCT_NAME = 'Plexora'
/** Adresse für Missbrauchsmeldungen im festen Sicherheitsteil */
export const ABUSE_ADDRESS = 'team@plexora.eu'
/** Einziger erlaubter Ursprung für Annahme-Links und Logos */
export const APP_ORIGIN = 'https://app.plexora.eu'
export const LOGO_BASE = 'https://plexora-files.s3.eu-central-1.amazonaws.com/'
export const LOGO_PREFIX = 'mail-logos'

/** Größe des Logos in der Mail (CSS-Pixel): höchstens 250 x 100, Seitenverhältnis bleibt. Gespeichert wird in doppelter Auflösung (bis 500 x 200). */
export const LOGO_DISPLAY_W = 250
export const LOGO_DISPLAY_H = 100
export const LOGO_STORE_W = 500
export const LOGO_STORE_H = 200
/** Anzeigegröße zu den gespeicherten Maßen: einpassen in 250 x 100, nie vergrößern */
export function logoDisplaySize(w: number, h: number): { w: number; h: number } {
  const scale = Math.min(1, LOGO_DISPLAY_W / w, LOGO_DISPLAY_H / h)
  return { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)) }
}
export const MAIL_LIMITS = { subject: 90, heading: 80, body: 500, button: 30, footer: 200, alt: 80 } as const

export const FONT_STACKS: Record<string, string> = {
  sans: "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  serif: "Georgia,'Times New Roman',Times,serif",
  mono: "'SFMono-Regular',Menlo,Consolas,'Courier New',monospace",
  arial: 'Arial,Helvetica,sans-serif',
  georgia: "Georgia,'Times New Roman',serif",
  verdana: 'Verdana,Geneva,sans-serif',
}
export const FONT_LABELS: Record<string, string> = { sans: 'Sans-serif (System)', serif: 'Serif (System)', mono: 'Monospace', arial: 'Arial', georgia: 'Georgia', verdana: 'Verdana' }

export const PLACEHOLDERS = ['einladender_name', 'einladender_email', 'eingeladene_email', 'produktname', 'ablauf_datum'] as const
export const PLACEHOLDER_LABELS: Record<string, string> = {
  einladender_name: 'Name des Einladenden', einladender_email: 'E-Mail des Einladenden', eingeladene_email: 'E-Mail der eingeladenen Person', produktname: 'Produktname', ablauf_datum: 'Ablaufdatum der Einladung',
}

export type Align = 'left' | 'center' | 'right'
export type Weight = 'normal' | 'bold'
export interface MailColors { page: string; card: string; heading: string; text: string; button: string; buttonText: string; buttonBorder: string; footer: string }
export interface InviteMailConfig {
  v: 1
  subject: string; heading: string; body: string; buttonText: string; footer: string
  colors: MailColors
  font: { family: string; headingSize: number; textSize: number; buttonSize: number; headingWeight: Weight; textWeight: Weight; buttonWeight: Weight }
  button: { radius: number; padV: number; padH: number; width: 'auto' | 'full'; align: Align; borderWidth: number }
  layout: { cardWidth: number; divider: boolean }
  /** file/w/h werden NUR vom Server beim Hochladen gesetzt und nie aus einer Anfrage übernommen */
  logo: { mode: 'none' | 'branding' | 'custom'; alt: string; align: Align; plate: boolean; plateColor: string; file: string; w: number; h: number }
}

// Standard-Blau des Buttons "Anfrage stellen" (Akzentfarbe der Kampagnen); dunkle Schrift darauf erreicht 4,5:1, weiße nicht.
export const BUTTON_BLUE = '#62a0ea'

export const DEFAULT_INVITE: InviteMailConfig = Object.freeze({
  v: 1,
  subject: 'Du wurdest zu {{produktname}} eingeladen',
  heading: 'Einladung zu {{produktname}}',
  body: '{{einladender_name}} hat dich eingeladen, dem Team auf {{produktname}} beizutreten.\n\nMit dem Button unten nimmst du die Einladung an.',
  buttonText: 'Einladung annehmen',
  footer: 'Du erhältst diese E-Mail, weil dich jemand zu {{produktname}} eingeladen hat.',
  colors: { page: '#f4f5f7', card: '#ffffff', heading: '#111827', text: '#374151', button: BUTTON_BLUE, buttonText: '#0a1f3d', buttonBorder: '', footer: '#6b7280' },
  font: { family: 'sans', headingSize: 24, textSize: 15, buttonSize: 16, headingWeight: 'bold', textWeight: 'normal', buttonWeight: 'bold' },
  button: { radius: 8, padV: 14, padH: 28, width: 'auto', align: 'center', borderWidth: 0 },
  layout: { cardWidth: 560, divider: true },
  logo: { mode: 'none', alt: PRODUCT_NAME, align: 'center', plate: false, plateColor: '#ffffff', file: '', w: 0, h: 0 },
}) as InviteMailConfig

type Preset = { label: string; colors: MailColors; patch?: Partial<{ font: Partial<InviteMailConfig['font']>; button: Partial<InviteMailConfig['button']>; layout: Partial<InviteMailConfig['layout']> }> }
export const STYLE_PRESETS: Record<string, Preset> = {
  hell: { label: 'Hell', colors: { ...DEFAULT_INVITE.colors } },
  dunkel: { label: 'Dunkel', colors: { page: '#0b0f1a', card: '#151b2b', heading: '#ffffff', text: '#d1d5db', button: BUTTON_BLUE, buttonText: '#0a1f3d', buttonBorder: '', footer: '#9ca3af' } },
  'plexora-blau': { label: 'Plexora-Blau', colors: { page: '#e8f0fc', card: '#ffffff', heading: '#0b3a75', text: '#1f2937', button: '#1558c0', buttonText: '#ffffff', buttonBorder: '', footer: '#4b5563' }, patch: { button: { radius: 10 } } },
  schlicht: { label: 'Schlicht', colors: { page: '#ffffff', card: '#ffffff', heading: '#000000', text: '#222222', button: '#000000', buttonText: '#ffffff', buttonBorder: '', footer: '#555555' }, patch: { font: { family: 'georgia', headingWeight: 'normal' }, button: { radius: 0, padV: 12 }, layout: { divider: false } } },
}

/** Anwenden einer Stilvorlage auf eine Konfiguration (Texte und Logo bleiben, Farben/Schrift/Button/Layout werden ersetzt) */
export function applyPreset(cfg: InviteMailConfig, key: string): InviteMailConfig {
  const p = Object.hasOwn(STYLE_PRESETS, key) ? STYLE_PRESETS[key] : undefined
  if (!p) return cfg
  return resolveInviteConfig({
    ...cfg, colors: { ...p.colors },
    font: { ...DEFAULT_INVITE.font, ...(p.patch?.font || {}) }, button: { ...DEFAULT_INVITE.button, ...(p.patch?.button || {}) }, layout: { ...DEFAULT_INVITE.layout, ...(p.patch?.layout || {}) },
  })
}

// ── Bereinigung beim Lesen (nie Fehler: ungültige Teile fallen auf den Standard zurück) ─────────────────────────────────────────────
const HEX = /^#[0-9a-fA-F]{6}$/
const num = (v: unknown, min: number, max: number, dflt: number) => { const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : dflt }
const pickEnum = <T extends string>(v: unknown, allowed: readonly T[], dflt: T): T => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : dflt)
const hex = (v: unknown, dflt: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : dflt)
const LOGO_FILE = /^mail-logos\/[a-f0-9]{16}\/[a-f0-9]{32}\.(png|jpg)$/

/** Steuerzeichen raus; Zeilenumbrüche je nach Feld. Absätze (nur im Text): höchstens eine Leerzeile. */
export function cleanLine(v: unknown, max: number): string { return String(v ?? '').replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) }
export function cleanBody(v: unknown, max: number): string {
  return String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]/g, ' ').split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max)
}

export function resolveInviteConfig(stored: unknown): InviteMailConfig {
  const s: any = stored && typeof stored === 'object' ? stored : {}
  const D = DEFAULT_INVITE
  const c = s.colors || {}, f = s.font || {}, b = s.button || {}, l = s.layout || {}, g = s.logo || {}
  const text = (v: unknown, max: number, dflt: string, multi = false) => { const t = multi ? cleanBody(v, max) : cleanLine(v, max); return t ? t : dflt }
  const file = typeof g.file === 'string' && LOGO_FILE.test(g.file) ? g.file : ''
  const mode = pickEnum(g.mode, ['none', 'branding', 'custom'] as const, D.logo.mode)
  return {
    v: 1,
    subject: text(s.subject, MAIL_LIMITS.subject, D.subject), heading: text(s.heading, MAIL_LIMITS.heading, D.heading), body: text(s.body, MAIL_LIMITS.body, D.body, true),
    buttonText: text(s.buttonText, MAIL_LIMITS.button, D.buttonText), footer: typeof s.footer === 'string' ? cleanLine(s.footer, MAIL_LIMITS.footer) : D.footer,
    colors: {
      page: hex(c.page, D.colors.page), card: hex(c.card, D.colors.card), heading: hex(c.heading, D.colors.heading), text: hex(c.text, D.colors.text),
      button: hex(c.button, D.colors.button), buttonText: hex(c.buttonText, D.colors.buttonText), buttonBorder: c.buttonBorder === '' ? '' : hex(c.buttonBorder, D.colors.buttonBorder), footer: hex(c.footer, D.colors.footer),
    },
    font: {
      family: typeof f.family === 'string' && Object.hasOwn(FONT_STACKS, f.family) ? f.family : D.font.family,
      headingSize: num(f.headingSize, 16, 40, D.font.headingSize), textSize: num(f.textSize, 12, 20, D.font.textSize), buttonSize: num(f.buttonSize, 12, 22, D.font.buttonSize),
      headingWeight: pickEnum(f.headingWeight, ['normal', 'bold'] as const, D.font.headingWeight), textWeight: pickEnum(f.textWeight, ['normal', 'bold'] as const, D.font.textWeight), buttonWeight: pickEnum(f.buttonWeight, ['normal', 'bold'] as const, D.font.buttonWeight),
    },
    button: { radius: num(b.radius, 0, 40, D.button.radius), padV: num(b.padV, 6, 28, D.button.padV), padH: num(b.padH, 12, 60, D.button.padH), width: pickEnum(b.width, ['auto', 'full'] as const, D.button.width), align: pickEnum(b.align, ['left', 'center', 'right'] as const, D.button.align), borderWidth: num(b.borderWidth, 0, 6, D.button.borderWidth) },
    layout: { cardWidth: num(l.cardWidth, 320, 640, D.layout.cardWidth), divider: typeof l.divider === 'boolean' ? l.divider : D.layout.divider },
    logo: {
      // "eigenes Logo" ohne gespeicherte Datei gibt es nicht
      mode: mode === 'custom' && !file ? 'none' : mode,
      alt: text(g.alt, MAIL_LIMITS.alt, D.logo.alt), align: pickEnum(g.align, ['left', 'center', 'right'] as const, D.logo.align), plate: typeof g.plate === 'boolean' ? g.plate : D.logo.plate, plateColor: hex(g.plateColor, D.logo.plateColor),
      file, w: file ? num(g.w, 1, LOGO_STORE_W, 0) : 0, h: file ? num(g.h, 1, LOGO_STORE_H, 0) : 0,
    },
  }
}

// ── Links in Texten erkennen (nicht erlaubt: kein Phishing über Betreff/Überschrift/Text/Fußzeile) ────────────────────────────────────
/** Unicode-Tricks (Vollbreite-Zeichen, Nullbreiten-Zeichen, Punkt-Varianten) vor der Prüfung glätten */
const fold = (s: string) => s.normalize('NFKC').replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF\u00AD]/g, '').replace(/[。．｡․﹒]/g, '.')
const LINK_PATTERNS: RegExp[] = [
  /[a-z][a-z0-9+.-]*:\/\//i,                                              // https://, ftp://, javascript://
  /\b(?:https?|ftp|file|mailto|tel|sms|javascript|data|vbscript|blob|about|view-source)\s*:/i,
  /(?:^|[^a-z0-9])www\s*\./i,
  /[^\s@<>()"']+@[^\s@<>()"']+/,                                          // E-Mail-Adresse
  /(?:^|[^\w])[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.(?:[a-z]{2,24})(?![\w-])/i, // Domain wie firma.de
  /\/\/[a-z0-9.-]+/i,
]
// Platzhalter enthalten Unterstriche, keine Punkte: vor der Prüfung entfernen, damit {{ablauf_datum}} nicht als Domain gilt
export function containsLink(text: string): boolean {
  const t = fold(String(text ?? '')).replace(/\{\{\s*[a-z_]+\s*\}\}/gi, ' ')
  return LINK_PATTERNS.some(re => re.test(t))
}

// ── Platzhalter ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const PH = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g
export const isKnownPlaceholder = (n: string) => (PLACEHOLDERS as readonly string[]).includes(n.toLowerCase())
/** Unbekannte Platzhalter eines Textes (erscheinen später als Klartext und werden im Editor markiert) */
export function unknownPlaceholders(text: string): string[] {
  const out: string[] = []
  for (const m of String(text ?? '').matchAll(PH)) if (!isKnownPlaceholder(m[1])) out.push(m[0])
  return [...new Set(out)]
}
export function applyPlaceholders(text: string, values: Record<string, string>): string {
  return String(text ?? '').replace(PH, (whole, name: string) => (isKnownPlaceholder(name) ? (values[name.toLowerCase()] ?? '') : whole))
}

// ── Kontrast (WCAG) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
export function luminance(h: string): number { const n = parseInt(h.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) }
export function contrastRatio(a: string, b: string): number { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
export const MIN_CONTRAST = 4.5
export interface ContrastWarning { key: 'heading' | 'text' | 'footer' | 'button'; ratio: number; message: string }
/** Warnungen (blockieren das Speichern nicht): Text auf Hintergrund und Button-Schrift auf Button */
export function contrastWarnings(cfg: InviteMailConfig): ContrastWarning[] {
  const c = cfg.colors, out: ContrastWarning[] = []
  const check = (key: ContrastWarning['key'], fg: string, bg: string, what: string) => { const r = contrastRatio(fg, bg); if (r < MIN_CONTRAST) out.push({ key, ratio: Math.round(r * 10) / 10, message: `${what} ist schlecht lesbar (Kontrast ${r.toFixed(1).replace('.', ',')} : 1, empfohlen mindestens 4,5 : 1).` }) }
  check('heading', c.heading, c.card, 'Die Überschrift auf dem Kartenhintergrund')
  check('text', c.text, c.card, 'Der Text auf dem Kartenhintergrund')
  check('footer', c.footer, c.card, 'Die Fußzeile auf dem Kartenhintergrund')
  check('button', c.buttonText, c.button, 'Die Button-Schrift auf dem Button')
  return out
}

// ── Strenge Prüfung beim Speichern (mit verständlichen Meldungen) ───────────────────────────────────────────────────────────────────
export type Validated = { ok: true; value: InviteMailConfig } | { ok: false; error: string; field: string }
const COLOR_LABELS: Record<string, string> = { page: 'Seitenhintergrund', card: 'Kartenhintergrund', heading: 'Überschrift', text: 'Text', button: 'Button-Hintergrund', buttonText: 'Button-Schrift', buttonBorder: 'Button-Rahmen', footer: 'Fußzeile' }
const NO_LINKS = 'Links, Adressen und E-Mail-Adressen sind in diesen Texten nicht erlaubt (Schutz vor Täuschung). Der Annahme-Link wird immer automatisch eingefügt.'

/**
 * existing: die bereits gespeicherte Konfiguration. Nur von dort kommen die Logo-Datei und ihre Maße – aus der Anfrage werden sie nie übernommen,
 * damit niemand auf die Datei eines anderen Mandanten zeigen kann.
 */
export function validateInviteConfig(input: unknown, existing?: unknown): Validated {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Die Vorlage hat ein ungültiges Format.', field: '' }
  const s: any = input
  const bad = (field: string, error: string): Validated => ({ ok: false, error, field })
  const textField = (field: string, label: string, max: number, multi = false, required = true): Validated | null => {
    const raw = s[field]
    if (raw === undefined || raw === null) return required ? bad(field, `${label} fehlt.`) : null
    if (typeof raw !== 'string') return bad(field, `${label} muss Text sein.`)
    if (!multi && /[\r\n\u2028\u2029\u0000-\u001f\u007f]/.test(raw)) return bad(field, `${label}: Zeilenumbrüche und Steuerzeichen sind hier nicht erlaubt.`)
    const t = multi ? cleanBody(raw, 100000) : raw.trim()
    if (required && !t) return bad(field, `${label} darf nicht leer sein.`)
    if (t.length > max) return bad(field, `${label}: höchstens ${max} Zeichen (aktuell ${t.length}).`)
    if (containsLink(t)) return bad(field, `${label}: ${NO_LINKS}`)
    return null
  }
  for (const e of [textField('subject', 'Der Betreff', MAIL_LIMITS.subject), textField('heading', 'Die Überschrift', MAIL_LIMITS.heading), textField('body', 'Der Text', MAIL_LIMITS.body, true),
    textField('buttonText', 'Der Button-Text', MAIL_LIMITS.button), textField('footer', 'Die Fußzeile', MAIL_LIMITS.footer, false, false)]) if (e) return e

  const c = s.colors; if (!c || typeof c !== 'object') return bad('colors', 'Die Farben fehlen.')
  for (const k of Object.keys(COLOR_LABELS)) {
    const v = c[k]
    if (k === 'buttonBorder' && (v === '' || v === undefined || v === null)) continue
    if (typeof v !== 'string' || !HEX.test(v)) return bad(`colors.${k}`, `Farbe "${COLOR_LABELS[k]}": bitte einen Hex-Wert wie #62a0ea angeben.`)
  }
  const f = s.font || {}, b = s.button || {}, l = s.layout || {}, g = s.logo || {}
  if (typeof f.family !== 'string' || !Object.hasOwn(FONT_STACKS, f.family)) return bad('font.family', 'Schrift: bitte eine Schrift aus der Liste wählen.')
  const range = (field: string, label: string, v: unknown, min: number, max: number): Validated | null => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? null : bad(field, `${label}: Wert zwischen ${min} und ${max} angeben.`))
  for (const e of [range('font.headingSize', 'Größe der Überschrift', f.headingSize, 16, 40), range('font.textSize', 'Größe des Textes', f.textSize, 12, 20), range('font.buttonSize', 'Größe der Button-Schrift', f.buttonSize, 12, 22),
    range('button.radius', 'Eckenradius', b.radius, 0, 40), range('button.padV', 'Innenabstand oben/unten', b.padV, 6, 28), range('button.padH', 'Innenabstand links/rechts', b.padH, 12, 60), range('button.borderWidth', 'Rahmenbreite', b.borderWidth, 0, 6),
    range('layout.cardWidth', 'Kartenbreite', l.cardWidth, 320, 640)]) if (e) return e
  for (const [k, v] of [['font.headingWeight', f.headingWeight], ['font.textWeight', f.textWeight], ['font.buttonWeight', f.buttonWeight]] as const) if (v !== 'normal' && v !== 'bold') return bad(k, 'Schriftschnitt: "normal" oder "fett".')
  if (b.width !== 'auto' && b.width !== 'full') return bad('button.width', 'Button-Breite: "automatisch" oder "volle Breite".')
  for (const [k, v] of [['button.align', b.align], ['logo.align', g.align]] as const) if (v !== 'left' && v !== 'center' && v !== 'right') return bad(k, 'Ausrichtung: links, mittig oder rechts.')
  if (typeof l.divider !== 'boolean') return bad('layout.divider', 'Trennlinie: an oder aus.')
  if (g.mode !== 'none' && g.mode !== 'branding' && g.mode !== 'custom') return bad('logo.mode', 'Logo: "kein Logo", "aus dem Branding" oder "eigenes Logo".')
  if (typeof g.alt !== 'string' || !g.alt.trim()) return bad('logo.alt', 'Der Alternativtext des Logos ist Pflicht (wird angezeigt, wenn das Bild blockiert wird).')
  if (/[\r\n\u0000-\u001f\u007f]/.test(g.alt) || g.alt.trim().length > MAIL_LIMITS.alt) return bad('logo.alt', `Alternativtext: höchstens ${MAIL_LIMITS.alt} Zeichen, ohne Zeilenumbrüche.`)
  if (containsLink(g.alt)) return bad('logo.alt', `Alternativtext: ${NO_LINKS}`)
  if (typeof g.plate !== 'boolean') return bad('logo.plate', 'Logo-Platte: an oder aus.')
  if (typeof g.plateColor !== 'string' || !HEX.test(g.plateColor)) return bad('logo.plateColor', 'Farbe der Logo-Platte: bitte einen Hex-Wert angeben.')

  // Logo-Datei und Maße kommen nur aus der gespeicherten Konfiguration
  const prev = resolveInviteConfig(existing).logo
  const merged = resolveInviteConfig({ ...s, logo: { ...g, file: prev.file, w: prev.w, h: prev.h } })
  if (g.mode === 'custom' && !prev.file) return bad('logo.mode', 'Bitte zuerst ein Logo hochladen oder eine andere Logo-Option wählen.')
  return { ok: true, value: merged }
}

// ── Darstellung ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const escapeText = (s: unknown) => String(s ?? '').replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' } as Record<string, string>)[c])

/** Annahme-Link: nur die Plexora-Domain, nur der feste Pfad, Token nur aus Buchstaben/Ziffern/Bindestrich */
const ACCEPT_URL = /^https:\/\/app\.plexora\.eu\/invite\?token=[A-Za-z0-9-]{8,64}$/
export const isAcceptUrl = (u: unknown): u is string => typeof u === 'string' && ACCEPT_URL.test(u)
/** Logo-Adresse: nur unser Bucket, nur Mandanten-/Branding-Präfix, nur PNG/JPG, keine Parameter */
const LOGO_URL = /^https:\/\/plexora-files\.s3\.eu-central-1\.amazonaws\.com\/(?:mail-logos|branding)\/[A-Za-z0-9._\/-]{1,200}\.(?:png|jpe?g)$/i
export const isLogoUrl = (u: unknown): u is string => typeof u === 'string' && LOGO_URL.test(u) && !u.includes('..') && !u.includes('//', 8)
export const logoUrlForFile = (file: string) => (LOGO_FILE.test(file) ? LOGO_BASE + file : '')

export const SECURITY_BOX = { bg: '#fff7e0', border: '#e0b13a', text: '#1f2937', link: '#0b4da2' } as const
export function formatDeDate(d: Date | string | number): string {
  const dt = d instanceof Date ? d : new Date(d)
  return Number.isFinite(dt.getTime()) ? dt.toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
}

/** Anzeigename: Steuerzeichen, Klammern und Anführungszeichen raus, keine Links, höchstens 60 Zeichen; sonst der Teil vor dem @ */
export function safeDisplayName(name: unknown, email: string): string {
  const n = cleanLine(String(name ?? '').replace(/[<>"'`\\]/g, ''), 60)
  if (n && !containsLink(n)) return n
  const local = cleanLine(String(email || '').split('@')[0].replace(/[<>"'`\\]/g, ''), 60)
  return local || PRODUCT_NAME
}

export interface InviteCtx {
  inviterName: string; inviterEmail: string; inviteeEmail: string; expiresAt: Date | string | number
  /** vom Server erzeugt: https://app.plexora.eu/invite?token=… */
  acceptUrl: string
  /** vom Server bestimmt (eigene Datei oder Branding-Logo auf unserem Bucket), sonst leer */
  logoUrl?: string | null
}
export interface RenderedMail { subject: string; html: string; text: string; fromName: string }

export const SAMPLE_CTX: InviteCtx = {
  inviterName: 'Maria Beispiel', inviterEmail: 'maria@beispiel-firma.de', inviteeEmail: 'neu@beispiel-firma.de', expiresAt: new Date(Date.now() + 7 * 86_400_000),
  acceptUrl: 'https://app.plexora.eu/invite?token=00000000-0000-4000-8000-000000000000', logoUrl: null,
}

const fontStack = (family: string) => (Object.hasOwn(FONT_STACKS, family) ? FONT_STACKS[family] : FONT_STACKS.sans)
const wght = (w: Weight) => (w === 'bold' ? 700 : 400)

export function renderInviteMail(cfgInput: unknown, ctx: InviteCtx): RenderedMail {
  if (!isAcceptUrl(ctx.acceptUrl)) throw new Error('Annahme-Link fehlt oder hat ein ungültiges Format')   // nie eine Einladung ohne gültigen Link versenden
  const cfg = resolveInviteConfig(cfgInput)
  const product = PRODUCT_NAME
  const inviterName = safeDisplayName(ctx.inviterName, ctx.inviterEmail)
  const expires = formatDeDate(ctx.expiresAt)
  const values: Record<string, string> = { einladender_name: inviterName, einladender_email: ctx.inviterEmail, eingeladene_email: ctx.inviteeEmail, produktname: product, ablauf_datum: expires }
  const ph = (t: string) => applyPlaceholders(t, values)
  const subject = (cleanLine(ph(cfg.subject), 150) || cleanLine(ph(DEFAULT_INVITE.subject), 150))
  const heading = ph(cfg.heading), bodyText = ph(cfg.body), buttonText = ph(cfg.buttonText), footer = ph(cfg.footer)
  const C = cfg.colors, F = cfg.font, B = cfg.button, ff = fontStack(F.family)
  const url = ctx.acceptUrl, e = escapeText, eu = e(url)
  const logoUrl = cfg.logo.mode !== 'none' && isLogoUrl(ctx.logoUrl) ? ctx.logoUrl : ''

  // Kopf: Logo (mit Alternativtext in Schriftfarbe, damit der Name auch bei blockierten Bildern lesbar bleibt) oder der Produktname als Text
  let header: string
  if (logoUrl) {
    // Ersatztext bei blockiertem Bild: auf der Platte in einer Farbe mit Kontrast zur Platte, sonst in der Überschriftfarbe
    const altColor = cfg.logo.plate ? (luminance(cfg.logo.plateColor) > 0.4 ? '#111827' : '#ffffff') : C.heading
    // gespeichert bis 500 x 200 (doppelte Auflösung), angezeigt höchstens 250 x 100 mit unverändertem Seitenverhältnis
    const dims = cfg.logo.mode === 'custom' && cfg.logo.w && cfg.logo.h ? logoDisplaySize(cfg.logo.w, cfg.logo.h) : null
    const w = dims ? dims.w : 160
    const img = `<img src="${e(logoUrl)}" width="${w}"${dims ? ` height="${dims.h}"` : ''} alt="${e(cfg.logo.alt)}" style="display:block;border:0;outline:none;text-decoration:none;width:${w}px;max-width:100%;height:${dims ? dims.h + 'px' : 'auto'};font-family:${ff};font-size:16px;font-weight:700;color:${altColor}">`
    const inner = cfg.logo.plate ? `<table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td bgcolor="${cfg.logo.plateColor}" style="background-color:${cfg.logo.plateColor};padding:10px 14px;border-radius:6px">${img}</td></tr></table>` : img
    header = `<tr><td align="${cfg.logo.align}" style="padding:28px 32px 0 32px"><table role="presentation" border="0" cellspacing="0" cellpadding="0" align="${cfg.logo.align}"><tr><td>${inner}</td></tr></table></td></tr>`
  } else {
    header = `<tr><td align="${cfg.logo.align}" style="padding:28px 32px 0 32px;font-family:${ff};font-size:18px;font-weight:700;color:${C.heading}">${e(product)}</td></tr>`
  }

  const paragraphs = bodyText.split(/\n{2,}/).map(p => `<p style="margin:0 0 14px 0;font-family:${ff};font-size:${F.textSize}px;line-height:1.55;font-weight:${wght(F.textWeight)};color:${C.text}">${e(p).replace(/\n/g, '<br>')}</p>`).join('')
  const border = B.borderWidth > 0 && C.buttonBorder ? `border:${B.borderWidth}px solid ${C.buttonBorder};` : 'border:0;'
  const btnStyle = `display:${B.width === 'full' ? 'block' : 'inline-block'};padding:${B.padV}px ${B.padH}px;background-color:${C.button};color:${C.buttonText};font-family:${ff};font-size:${F.buttonSize}px;font-weight:${wght(F.buttonWeight)};line-height:1.2;text-decoration:none;border-radius:${B.radius}px;${border}${B.width === 'full' ? 'text-align:center;' : ''}`
  const button = `<tr><td align="${B.align}" style="padding:8px 32px 24px 32px"><table role="presentation" border="0" cellspacing="0" cellpadding="0"${B.width === 'full' ? ' width="100%"' : ` align="${B.align}"`}><tr><td align="center" bgcolor="${C.button}" style="background-color:${C.button};border-radius:${B.radius}px;${border}"><a href="${eu}" target="_blank" style="${btnStyle}">${e(buttonText)}</a></td></tr></table></td></tr>`

  const S = SECURITY_BOX
  const abuse = e(ABUSE_ADDRESS)
  const security = `<tr><td style="padding:0 32px 24px 32px"><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td bgcolor="${S.bg}" style="background-color:${S.bg};border:1px solid ${S.border};border-radius:8px;padding:14px 16px;font-family:${FONT_STACKS.sans};font-size:13px;line-height:1.5;color:${S.text}">`
    + `<div style="font-weight:700;color:${S.text};margin:0 0 6px 0">Sicherheitshinweis</div>`
    + `<div style="color:${S.text};margin:0 0 8px 0">Annahme-Link:<br><a href="${eu}" target="_blank" style="color:${S.link};word-break:break-all;text-decoration:underline">${eu}</a></div>`
    + `<div style="color:${S.text};margin:0 0 8px 0">Diese Einladung wurde von ${e(ctx.inviterEmail)} für ${e(ctx.inviteeEmail)} erstellt und ist bis ${e(expires)} gültig.</div>`
    + `<div style="color:${S.text};margin:0">Wenn du diese E-Mail nicht erwartet hast, ignoriere sie. Missbrauch melden: ${abuse}</div>`
    + `</td></tr></table></td></tr>`

  const divider = cfg.layout.divider ? `<tr><td style="padding:0 32px"><div style="height:1px;line-height:1px;font-size:1px;border-top:1px solid ${C.footer};opacity:.35">&nbsp;</div></td></tr>` : ''
  const foot = footer ? `<tr><td style="padding:16px 32px 28px 32px;font-family:${ff};font-size:12px;line-height:1.5;color:${C.footer}">${e(footer).replace(/\n/g, '<br>')}</td></tr>` : ''
  const W = cfg.layout.cardWidth

  const html = `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml" style="background-color:${C.page}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${e(subject)}</title><style type="text/css">:root{color-scheme:light dark;supported-color-schemes:light dark}</style></head>
<body style="margin:0;padding:0;background-color:${C.page}" bgcolor="${C.page}">
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="${C.page}" style="background-color:${C.page}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="${W}" border="0" cellspacing="0" cellpadding="0" bgcolor="${C.card}" style="width:100%;max-width:${W}px;background-color:${C.card};border-radius:12px">
${header}
<tr><td style="padding:20px 32px 6px 32px"><h1 style="margin:0 0 14px 0;font-family:${ff};font-size:${F.headingSize}px;line-height:1.25;font-weight:${wght(F.headingWeight)};color:${C.heading}">${e(heading)}</h1>${paragraphs}</td></tr>
${button}
${security}
${divider}
${foot}
</table>
</td></tr></table>
</body></html>`

  const text = [
    heading, '', bodyText, '', `${buttonText}:`, url, '',
    '--- Sicherheitshinweis ---', `Annahme-Link: ${url}`,
    `Diese Einladung wurde von ${ctx.inviterEmail} für ${ctx.inviteeEmail} erstellt und ist bis ${expires} gültig.`,
    `Wenn du diese E-Mail nicht erwartet hast, ignoriere sie. Missbrauch melden: ${ABUSE_ADDRESS}`,
    ...(footer ? ['', footer] : []),
  ].join('\n')

  return { subject, html, text, fromName: cleanLine(`${inviterName} über ${product}`, 70).replace(/["\\<>]/g, '') }
}
