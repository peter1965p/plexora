// Hero-Bildwand der Startseite: eine geneigte Wand aus Plexora-Screenshots, die sich beim Scrollen aufrichtet und den Bildschirm füllt.
// Reine Logik (Auswahl prüfen, Spalten bilden, Bewegung rechnen): Startseite und Einstellungen benutzen dasselbe. Die Farben bleiben die der Startseite.
export interface WallImage { key: string; label: string; alt: string }
/** Bildbibliothek (public/wall/<key>.webp und <key>-klein.webp, echte Aufnahmen aus dem Demo-Konto) */
export const WALL_IMAGES: WallImage[] = [
  { key: 'dashboard', label: 'Dashboard', alt: 'Plexora Dashboard mit Kennzahlen und Pipeline' },
  { key: 'finanzen', label: 'Finanzen: Rechnungen', alt: 'Rechnungsliste in Plexora Finanzen' },
  { key: 'erechnung', label: 'E-Rechnung prüfen', alt: 'E-Rechnung prüfen: XRechnung und ZUGFeRD bereit' },
  { key: 'eingang', label: 'Eingangsrechnungen', alt: 'Eingangsrechnungen lesen und verwalten' },
  { key: 'planer', label: 'Projektplaner (Gantt)', alt: 'Projektplaner als Gantt-Diagramm' },
  { key: 'crm', label: 'CRM: Kontakte', alt: 'CRM mit Kontakten und Status' },
  { key: 'marketing', label: 'Marketing: Kampagnen', alt: 'Marketing-Kampagnen und Lead-Seiten' },
  { key: 'leadseite', label: 'Lead-Seite (öffentlich)', alt: 'Öffentliche Lead-Seite mit Anfrageformular' },
  { key: 'termine', label: 'Termine: Kalender', alt: 'Terminkalender mit Wochenansicht' },
  { key: 'support', label: 'Support: Tickets', alt: 'Support-Tickets mit Priorität und Status' },
  { key: 'fitness', label: 'Branche: Fitness & Sport', alt: 'Branchen-Paket Fitness & Sport' },
  { key: 'taxi', label: 'Branche: Taxi & Fahrdienst', alt: 'Branchen-Paket Taxi & Fahrdienst' },
  { key: 'store', label: 'Modul-Store', alt: 'Modul-Store mit Basis-Modulen' },
  { key: 'website', label: 'Website (Nexora)', alt: 'Website-Editor mit Nexora' },
  { key: 'analytics', label: 'Analytics', alt: 'Analytics mit Diagrammen' },
  { key: 'hr', label: 'HR: Mitarbeiter', alt: 'Personalverwaltung' },
]
export const WALL_MAX = 16
export interface LandingWall { on: boolean; intensity: number; images: string[]; stickyCta: boolean; ctaLabel: string }
export const DEFAULT_WALL: LandingWall = { on: true, intensity: 100, images: WALL_IMAGES.map(i => i.key), stickyCta: true, ctaLabel: '' }

const known = new Set(WALL_IMAGES.map(i => i.key))
/** Gespeicherte oder gesendete Einstellung prüfen: nur bekannte Bilder (ohne Doppelte, höchstens 16), Stärke 0 bis 100, Schaltflächentext höchstens 40 Zeichen */
export function parseWall(raw: any): LandingWall {
  const w = raw && typeof raw === 'object' ? raw : {}
  const imgs: string[] = []
  if (Array.isArray(w.images)) for (const k of w.images) if (typeof k === 'string' && known.has(k) && !imgs.includes(k)) imgs.push(k)
  const n = Math.round(Number(w.intensity))
  return {
    on: w.on === false ? false : true,
    intensity: w.intensity === undefined || w.intensity === null || w.intensity === '' || !Number.isFinite(n) ? DEFAULT_WALL.intensity : Math.min(100, Math.max(0, n)),
    images: Array.isArray(w.images) ? imgs.slice(0, WALL_MAX) : [...DEFAULT_WALL.images],
    stickyCta: w.stickyCta === false ? false : true,
    ctaLabel: String(w.ctaLabel ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40),
  }
}

/** Bilder reihum auf 4 Spalten verteilen (Bild 1 Spalte 1, Bild 2 Spalte 2 …) */
export function wallColumns(keys: string[], cols = 4): string[][] {
  const out: string[][] = Array.from({ length: cols }, () => [])
  keys.forEach((k, i) => out[i % cols].push(k))
  return out
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
/** Weicher Verlauf (Easing) für 0 bis 1 */
export const ease = (t: number) => { const x = clamp01(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2 }

export interface WallFrame { wrapper: string; textOpacity: number; textShift: number; fade: number; grid: string; cols: string[] }
const COL_OFFSETS = [-5, -37, -13, -32]
/** Zustand der Bildwand für den Scrollfortschritt p (0 = geneigt rechts, 1 = flach und bildschirmfüllend); strength 0 bis 1 skaliert die Neigung */
export function wallFrame(p: number, strength = 1): WallFrame {
  const t = ease(p), k = clamp01(strength), r = (v: number) => Math.round(v * 100) / 100
  return {
    wrapper: `translate3d(${r(lerp(40, 0, t))}%, 0px, 0px) scale3d(${r(lerp(0.8, 1, t))}, ${r(lerp(0.8, 1, t))}, 1) rotateX(${r(lerp(15, 0, t) * k)}deg) rotateY(${r(lerp(-9, 0, t) * k)}deg) rotateZ(${r(lerp(32, 0, t) * k)}deg)`,
    textOpacity: r(1 - clamp01(p / 0.45)), textShift: r(lerp(0, -80, clamp01(p / 0.45))),
    fade: r(1 - clamp01(p / 0.6)),
    grid: `translate3d(0px, ${r(lerp(20, 0, t))}vh, 0px)`,
    cols: COL_OFFSETS.map(o => `translate3d(0px, ${r(lerp(o, 0, t))}vh, 0px) rotateX(${r(lerp(-15, 0, t) * k)}deg)`),
  }
}
/** Fortschritt 0 bis 1 aus der Lage des Hero-Bereichs: wie weit ist man durch die Scrollstrecke (Bereichshöhe minus Fensterhöhe) */
export function scrollProgress(top: number, height: number, viewport: number): number {
  const range = Math.max(1, height - viewport)
  return clamp01(-top / range)
}
