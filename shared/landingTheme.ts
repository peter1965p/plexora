// Design der öffentlichen Plexora-Startseite: gespeicherte Auswahl prüfen und daraus die CSS-Variablen der Seite berechnen.
// Reine Logik (kein Netz, keine Datenbank): derselbe Code liefert die Variablen für die Startseite und für die Vorschau in den Einstellungen.
export type LandingMode = 'light' | 'dark' | 'custom'
export interface LandingTheme {
  mode: LandingMode
  /** Hintergrundfarbe der Seite (#rrggbb) und ihre Deckkraft in Prozent. Die Seite liegt auf Weiß: 75 % Schwarz ergibt ein dunkles Grau. */
  bg: string; bgOpacity: number
  /** Vordergrund/Akzent: Schaltflächen, Zahlen, Hervorhebungen */
  accent: string
  /** Textfarbe; leer = automatisch passend zum Hintergrund */
  text: string
  /** Kennzahlen-Leiste unter dem Kopfbereich ("Display"): eigener Hintergrund und eigene Zahlenfarbe, unabhängig vom Design */
  display: LandingDisplay
}
export interface LandingDisplay { on: boolean; bg: string; bgOpacity: number; fg: string }
export const DEFAULT_DISPLAY: LandingDisplay = { on: true, bg: '#000000', bgOpacity: 70, fg: '#2f7bff' }
export const DEFAULT_LANDING_THEME: LandingTheme = { mode: 'light', bg: '#000000', bgOpacity: 75, accent: '#1e3a8a', text: '', display: { ...DEFAULT_DISPLAY } }

export const PRESETS: Array<{ key: string; label: string; theme: Omit<LandingTheme, 'display'> }> = [
  { key: 'deepblue', label: 'Deep Blue auf 75 % Schwarz', theme: { mode: 'custom', bg: '#000000', bgOpacity: 75, accent: '#1e3a8a', text: '' } },
  { key: 'midnight', label: 'Mitternacht & Orange', theme: { mode: 'custom', bg: '#0b1020', bgOpacity: 100, accent: '#ea580c', text: '' } },
  { key: 'ocean', label: 'Ozean (hell)', theme: { mode: 'custom', bg: '#e0f2fe', bgOpacity: 100, accent: '#0369a1', text: '' } },
  { key: 'forest', label: 'Wald (hell)', theme: { mode: 'custom', bg: '#ecfdf3', bgOpacity: 100, accent: '#15803d', text: '' } },
  { key: 'friendly', label: 'Freundlich (Standard)', theme: { mode: 'light', bg: '#000000', bgOpacity: 75, accent: '#1e3a8a', text: '' } },
]

const HEX = /^#[0-9a-f]{6}$/i
export const isHex = (s: unknown): s is string => typeof s === 'string' && HEX.test(s)
const hexOr = (v: unknown, def: string) => (isHex(v) ? v.toLowerCase() : def)

/** Prüft und bereinigt eine gespeicherte oder gesendete Auswahl; Ungültiges wird durch Standardwerte ersetzt */
export function parseLandingTheme(raw: any): LandingTheme {
  const b = raw && typeof raw === 'object' ? raw : {}
  const op = Math.round(Number(b.bgOpacity))
  return {
    mode: b.mode === 'dark' || b.mode === 'custom' ? b.mode : 'light',
    bg: hexOr(b.bg, DEFAULT_LANDING_THEME.bg),
    bgOpacity: Number.isFinite(op) ? Math.min(100, Math.max(0, op)) : DEFAULT_LANDING_THEME.bgOpacity,
    accent: hexOr(b.accent, DEFAULT_LANDING_THEME.accent),
    text: isHex(b.text) ? b.text.toLowerCase() : '',
    display: parseDisplay(b.display),
  }
}

export function parseDisplay(raw: any): LandingDisplay {
  const d = raw && typeof raw === 'object' ? raw : {}
  const op = Math.round(Number(d.bgOpacity))
  return {
    on: d.on === false ? false : true,
    bg: hexOr(d.bg, DEFAULT_DISPLAY.bg),
    bgOpacity: Number.isFinite(op) && d.bgOpacity !== null && d.bgOpacity !== '' ? Math.min(100, Math.max(0, op)) : DEFAULT_DISPLAY.bgOpacity,
    fg: hexOr(d.fg, DEFAULT_DISPLAY.fg),
  }
}

// ── Farbrechnung ──
type RGB = [number, number, number]
export const hexToRgb = (hex: string): RGB => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)) as RGB
export const rgbToHex = (c: RGB) => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')
/** Farbe mit Deckkraft über einen Untergrund legen (Standard: Weiß) */
export const blend = (fg: string, alpha: number, base = '#ffffff') => { const f = hexToRgb(fg), b = hexToRgb(base); return rgbToHex(f.map((v, i) => v * alpha + b[i] * (1 - alpha)) as RGB) }
export const mix = (a: string, b: string, t: number) => blend(b, t, a)      // t = Anteil von b
const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
export const luminance = (hex: string) => { const [r, g, b] = hexToRgb(hex); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) }
/** Kontrastverhältnis nach WCAG (1 bis 21); ab 4,5 gilt normaler Text als gut lesbar */
export const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) }
/** Färbt eine Farbe schrittweise Richtung Weiß (dunkler Grund) oder Schwarz (heller Grund), bis sie auf dem Grund gut lesbar ist */
export function readableOn(color: string, bgHex: string, min = 4.5): string {
  const toward = luminance(bgHex) < 0.4 ? '#ffffff' : '#000000'
  let c = color
  for (let i = 0; i < 20 && contrast(c, bgHex) < min; i++) c = mix(c, toward, 0.12)
  return c
}
const rgbCsv = (hex: string) => hexToRgb(hex).join(',')

/** Farben der Kennzahlen-Leiste. pageBg = tatsächliche Seitenfarbe dahinter: darauf wird die Deckkraft gerechnet und die Zahlenfarbe bei Bedarf aufgehellt (Zahlen sind große Schrift: Kontrast ab 3:1). */
export function displayVars(d: LandingDisplay, pageBg: string): { vars: Record<string, string>; effectiveBg: string; fg: string; contrast: number } {
  const effectiveBg = blend(d.bg, d.bgOpacity / 100, pageBg)
  const fg = readableOn(d.fg, effectiveBg, 3)
  return {
    effectiveBg, fg, contrast: round1(contrast(fg, effectiveBg)),
    vars: {
      '--disp-bg': `rgba(${rgbCsv(d.bg)},${d.bgOpacity / 100})`,
      '--disp-fg': fg,
      '--disp-glow': `rgba(${rgbCsv(fg)},0.55)`,
      '--disp-border': `rgba(${rgbCsv(fg)},0.35)`,
      '--disp-label': mix(fg, luminance(effectiveBg) < 0.4 ? '#ffffff' : '#000000', 0.7),
    },
  }
}

export interface ThemeResult { dark: boolean; vars: Record<string, string>; info: { bg: string; text: string; textContrast: number; accentOnBgContrast: number; buttonText: string; buttonContrast: number } }

/** Die berechneten Farben für den Modus "custom". Aus Hintergrund, Akzent und (optional) Textfarbe entstehen alle Variablen der Startseite. */
export function customTheme(t: LandingTheme): ThemeResult {
  const bg = blend(t.bg, t.bgOpacity / 100)
  // Automatische Textfarbe: die lesbarere von heller und dunkler Schrift (nie unter 4,5:1, auch bei mittleren Grautönen)
  const lightT = contrast('#f5f2fa', bg) >= 4.5 ? '#f5f2fa' : '#ffffff', darkT = contrast('#1f1a26', bg) >= 4.5 ? '#1f1a26' : '#000000'
  const useLight = contrast(lightT, bg) >= contrast(darkT, bg)
  const dark = t.text ? luminance(bg) < 0.4 : useLight
  const text = t.text || (useLight ? lightT : darkT)
  const card = dark ? mix(bg, '#ffffff', 0.07) : mix(bg, '#ffffff', 0.65)
  const card2 = dark ? mix(bg, '#ffffff', 0.04) : mix(bg, '#ffffff', 0.8)
  const accent = t.accent
  const accentText = readableOn(accent, bg)                     // Akzent als Schriftfarbe (Zahlen, Hervorhebungen)
  const btnText = contrast('#ffffff', accent) >= contrast('#111111', accent) ? '#ffffff' : '#111111'
  const ink = dark ? '255,255,255' : rgbCsv(text)
  const vars: Record<string, string> = {
    '--bg': bg, '--card': card, '--card2': card2, '--text': text, '--text-strong': text,
    '--body': mix(text, bg, 0.12), '--muted': mix(text, bg, 0.38), '--muted2': mix(text, bg, 0.26), '--faint': mix(text, bg, 0.5), '--faint2': mix(text, bg, 0.5), '--faint3': mix(text, bg, 0.6),
    // Schaltflächen behalten die gewählte Farbe; überall, wo der Akzent als Schrift, Verlauf oder Rahmen steht, gilt die lesbare Variante
    '--accent': accentText, '--accent-rgb': rgbCsv(accentText), '--accent2-rgb': rgbCsv(accentText),
    '--btn': accent, '--btn-text': btnText,
    '--g1': mix(accentText, '#ffffff', 0.3), '--g2': accentText, '--g3': mix(accentText, dark ? '#000000' : '#000000', dark ? 0.15 : 0.25),
    '--blue': accentText, '--blue2': accentText, '--blue-rgb': rgbCsv(accentText), '--orange2': accentText,
    '--ink': ink, '--shadow': dark ? '0,0,0' : '60,60,80',
    '--nav-bg': `rgba(${rgbCsv(bg)},0.88)`, '--footer-bg': `rgba(${rgbCsv(dark ? mix(bg, '#000000', 0.25) : mix(bg, '#000000', 0.04))},0.9)`,
    // Der Verlauf wiederholt sich alle 90 % der Fensterhöhe: die Leuchtflecken liegen in der Kachelmitte und laufen zu den Rändern auf 0 aus, sonst entsteht an jeder Kachelgrenze eine sichtbare Kante
    '--page-bg': `radial-gradient(ellipse 80% 45% at 12% 50%, rgba(${rgbCsv(accentText)},${dark ? 0.30 : 0.18}) 0%, transparent 100%), radial-gradient(ellipse 70% 45% at 92% 50%, rgba(${rgbCsv(accentText)},${dark ? 0.14 : 0.10}) 0%, transparent 100%)`,
  }
  return { dark, vars, info: { bg, text, textContrast: round1(contrast(text, bg)), accentOnBgContrast: round1(contrast(accent, bg)), buttonText: btnText, buttonContrast: round1(contrast(btnText, accent)) } }
}
const round1 = (n: number) => Math.round(n * 10) / 10

/** Hinweise für die Einstellungen: was bei der Auswahl schlecht lesbar wäre */
export function themeWarnings(t: LandingTheme): string[] {
  if (t.mode !== 'custom') return []
  const r = customTheme(t), out: string[] = []
  if (r.info.textContrast < 4.5) out.push(`Text auf dem Hintergrund ist schwer lesbar (Kontrast ${r.info.textContrast}:1, gut ab 4,5:1). Wähle eine hellere oder dunklere Textfarbe.`)
  if (r.info.buttonContrast < 4.5) out.push(`Die Schrift auf den Schaltflächen ist schwer lesbar (Kontrast ${r.info.buttonContrast}:1).`)
  if (r.info.accentOnBgContrast < 3 && t.accent) out.push(`Der Akzent hebt sich kaum vom Hintergrund ab (Kontrast ${r.info.accentOnBgContrast}:1). Schaltflächen und Zahlen werden deshalb automatisch aufgehellt bzw. abgedunkelt dargestellt.`)
  return out
}

// ── Auswahl der Branchen-Pakete auf der Startseite ──
/** Gespeicherte Auswahl prüfen: null = alle anzeigen (Standard), sonst die gewählten Schlüssel in der gewählten Reihenfolge (ohne Doppelte, höchstens 24) */
export function parseLandingPackages(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const out: string[] = []
  for (const k of raw) if (typeof k === 'string' && /^[a-z0-9-]{1,40}$/.test(k) && !out.includes(k)) out.push(k)
  return out.slice(0, 24)
}
/** Wendet die Auswahl auf die verfügbaren Pakete an: ohne Auswahl alle (nach Name), sonst nur die gewählten in gewählter Reihenfolge; unbekannte Schlüssel entfallen */
export function selectPackages<T extends { key: string; name: string }>(all: T[], shown: string[] | null): T[] {
  if (shown === null) return [...all].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  const byKey = new Map(all.map(p => [p.key, p]))
  return shown.map(k => byKey.get(k)).filter((p): p is T => !!p)
}
