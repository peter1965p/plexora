// Erlaubte Entwurfs-Typen und ihre Felder (Whitelist). Alles, was hier nicht steht, wird verworfen.
// Bilder werden nur als URL/Referenz gespeichert, nie als Dateidaten (data:-URLs sind abgelehnt).

export type FieldRule =
  | { kind: 'string'; max: number }
  | { kind: 'url'; max: number }
  | { kind: 'color' }
  | { kind: 'date' }
  | { kind: 'boolean' }
  | { kind: 'number'; min: number; max: number }
  | { kind: 'stringList'; maxItems: number; maxItemLength: number }

export interface DraftSchema {
  /** Feld, aus dem der Anzeigename des Entwurfs kommt */
  nameField: string
  fields: Record<string, FieldRule>
}

export const MAX_PAYLOAD_BYTES = 32 * 1024

export const DRAFT_SCHEMAS: Record<string, DraftSchema> = {
  'marketing-campaign': {
    nameField: 'name',
    fields: {
      name: { kind: 'string', max: 120 },
      slug: { kind: 'string', max: 80 },
      formId: { kind: 'string', max: 80 },
      headline: { kind: 'string', max: 200 },
      subtext: { kind: 'string', max: 500 },
      headerImageUrl: { kind: 'url', max: 1000 },
      bgImageUrl: { kind: 'url', max: 1000 },
      accentColor: { kind: 'color' },
      bgColor: { kind: 'color' },
      contentTitle: { kind: 'string', max: 200 },
      contentItems: { kind: 'stringList', maxItems: 8, maxItemLength: 200 },
      utmSource: { kind: 'string', max: 100 },
      utmMedium: { kind: 'string', max: 100 },
      utmCampaign: { kind: 'string', max: 100 },
      appointmentEnabled: { kind: 'boolean' },
      appointmentName: { kind: 'string', max: 120 },
      appointmentDurationMinutes: { kind: 'number', min: 5, max: 480 },
      endsAt: { kind: 'date' },
    },
  },
}

export class DraftError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}

export function getSchema(type: string): DraftSchema {
  // Object.hasOwn: verhindert Treffer wie "__proto__" oder "constructor"
  if (!Object.hasOwn(DRAFT_SCHEMAS, type)) throw new DraftError(404, 'Unbekannter Entwurfs-Typ')
  return DRAFT_SCHEMAS[type]
}

const COLOR = /^#[0-9a-fA-F]{3,8}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const URL_RE = /^(https?:\/\/|\/)[^\s]*$/i

function cleanString(v: unknown, max: number): string | undefined {
  if (typeof v !== 'string') return undefined
  // Steuerzeichen raus, Länge begrenzen
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max)
}

/** Prüft Größe, entfernt unbekannte Felder und erzwingt Typ und Länge je Feld. */
export function sanitizeDraft(type: string, payload: unknown): Record<string, unknown> {
  const schema = getSchema(type)
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new DraftError(400, 'Ungültiger Entwurf')
  }
  let size = 0
  try { size = Buffer.byteLength(JSON.stringify(payload), 'utf8') } catch { throw new DraftError(400, 'Ungültiger Entwurf') }
  if (size > MAX_PAYLOAD_BYTES) throw new DraftError(413, 'Entwurf ist zu groß')

  const src = payload as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [key, rule] of Object.entries(schema.fields)) {
    if (!Object.hasOwn(src, key)) continue
    const v = src[key]
    switch (rule.kind) {
      case 'string': {
        const s = cleanString(v, rule.max)
        if (s !== undefined) out[key] = s
        break
      }
      case 'url': {
        const s = cleanString(v, rule.max)
        // Nur http(s)- oder relative Adressen; data:/javascript: und Dateidaten werden verworfen
        if (s !== undefined) out[key] = s === '' || URL_RE.test(s) ? s : ''
        break
      }
      case 'color':
        if (typeof v === 'string' && COLOR.test(v)) out[key] = v
        break
      case 'date':
        if (typeof v === 'string' && (v === '' || DATE.test(v))) out[key] = v
        break
      case 'boolean':
        if (typeof v === 'boolean') out[key] = v
        break
      case 'number':
        if (typeof v === 'number' && Number.isFinite(v)) out[key] = Math.min(rule.max, Math.max(rule.min, Math.round(v)))
        break
      case 'stringList':
        if (Array.isArray(v)) {
          out[key] = v.slice(0, rule.maxItems)
            .map(item => cleanString(item, rule.maxItemLength))
            .filter((s): s is string => s !== undefined)
        }
        break
    }
  }
  return out
}
