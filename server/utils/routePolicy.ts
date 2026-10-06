// Gemeinsame Quelle für "welche API-Routen sind bewusst ohne Anmeldung erreichbar".
// Wird von der Middleware (server/middleware/auth.ts) UND vom Routen-Test (tests/security/route-policy.test.ts) verwendet.
// Jede Regel braucht eine Begründung. Eine neue öffentliche Route wird hier eingetragen – oder sie braucht eine Anmeldung.

export interface PublicRule {
  reason: string
  /** Pfad beginnt mit … */
  prefix?: string
  /** Pfad passt auf … (Segmente in [..] sind im Test durch "x" ersetzt) */
  pattern?: RegExp
  /** nur diese Methoden (Standard: alle) */
  methods?: string[]
  /** Route liest ein vorhandenes Token zusätzlich (z. B. Entwürfe des Besitzers, Firmendaten für angemeldete Mandanten); fehlt es, bleibt sie erreichbar */
  optionalAuth?: boolean
}

export const PUBLIC_RULES: PublicRule[] = [
  // ── Prefix-Regeln (waren schon in der Middleware) ──
  { prefix: '/api/public/', reason: 'Öffentliche Website-/Buchungs-/Newsletter-Schnittstellen; Tenant-ID bzw. Token im Pfad, Drossel und Bot-Schutz je Route' },
  { prefix: '/api/webhooks/', reason: 'Webhooks von Stripe/Resend mit eigener Signaturprüfung' },
  { prefix: '/api/licenses/checkout', reason: 'Kaufstrecke der Landingpage (Stripe-Sitzung anlegen)' },
  { prefix: '/api/licenses/validate', reason: 'Lizenzprüfung per Schlüssel durch Kundeninstallationen' },
  { prefix: '/api/pay/', reason: 'Zahlungslink einer Rechnung (UUID als Geheimnis)' },
  { prefix: '/api/support/portal/', reason: 'Kundenportal-Link eines Tickets (Token als Geheimnis)' },
  { prefix: '/api/jobs/', reason: 'Öffentliche Stellenanzeigen und Bewerbung (UUID im Link)' },

  // ── Exakte Pfade ──
  { pattern: /^\/api\/forms\/[^/]+\/submit$/, reason: 'Lead-Formular einer Kampagne; Endkunden sind nicht angemeldet; Drossel + Bot-Schutz' },
  { pattern: /^\/api\/newsletter\/cron\/run-automations$/, reason: 'EventBridge-Zeitplan, Route prüft Secret-Header' },
  { pattern: /^\/api\/sequences\/cron\/sweep$/, reason: 'EventBridge-Zeitplan, Route prüft Secret-Header' },
  { pattern: /^\/api\/termine\/cron\/reminders$/, reason: 'EventBridge-Zeitplan, Route prüft Secret-Header' },

  // ── Neu aufgenommen (bisher nur durch fehlenden Enforce-Schalter erreichbar) ──
  { pattern: /^\/api\/marketing\/public\/[^/]+$/, methods: ['GET'], reason: 'Landingpage einer Kampagne (nur freigegebene Felder)' },
  { pattern: /^\/api\/pages\/[^/]+$/, methods: ['GET'], optionalAuth: true, reason: 'Veröffentlichte Seiten der Website; Entwürfe nur für den Besitzer' },
  { pattern: /^\/api\/pages$/, methods: ['GET'], optionalAuth: true, reason: 'Navigation der öffentlichen Seiten (Startseite, /p/…)' },
  { pattern: /^\/api\/settings\/(agb|datenschutz)$/, methods: ['GET'], reason: 'Rechtstexte, öffentlich anzeigbar' },
  { pattern: /^\/api\/settings\/branding$/, methods: ['GET'], optionalAuth: true, reason: 'Markenname/-farbe für Login- und Landingseiten (anonym nur globale Werte)' },
  { pattern: /^\/api\/settings\/company$/, methods: ['GET'], optionalAuth: true, reason: 'Impressum/Anbieterkennzeichnung (anonym nur Pflichtangaben, keine Bankdaten)' },
  { pattern: /^\/api\/licenses\/(?!my$)[^/]+$/, methods: ['GET'], reason: 'Lizenzstatus per Schlüssel (nur Status, Stufe, Module, Gültigkeit)' },
  { pattern: /^\/api\/analytics\/vitals$/, methods: ['POST'], reason: 'Web-Vitals-Messung öffentlicher Seiten (anonym)' },
  { pattern: /^\/api\/termine\/google-callback$/, methods: ['GET'], reason: 'OAuth-Rücksprung von Google (Bindung des state an die Sitzung folgt in Block d)' },
  { pattern: /^\/api\/shop\/webhook$/, methods: ['POST'], reason: 'Stripe-Webhook des Shops mit Signaturprüfung' },
  { pattern: /^\/api\/internal\/backup\/run$/, methods: ['POST'], reason: 'Interner Aufruf der Lambda plexora-backup-worker (Secret-Header, timingSafeEqual, nur für einen bereits angelegten Auftrag); kein Browser-Zugriff' },
  { pattern: /^\/api\/team\/accept$/, methods: ['POST'], reason: 'Einladung annehmen: Token + E-Mail aus dem Einladungslink' },
]

export function findPublicRule(path: string, method = 'GET'): PublicRule | undefined {
  const p = path.split('?')[0]
  const m = method.toUpperCase()
  return PUBLIC_RULES.find((r) => {
    if (r.methods && m !== 'ANY' && !r.methods.includes(m)) return false
    if (r.prefix && p.startsWith(r.prefix)) return true
    if (r.pattern && r.pattern.test(p)) return true
    return false
  })
}

export function isPublicRoute(path: string, method = 'GET'): boolean {
  return !!findPublicRule(path, method)
}
