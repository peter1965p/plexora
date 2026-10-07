import type { RoleNeed } from '../../shared/roles'

// Welche Route verlangt welche Rolle? Eine Tabelle für die Middleware (server/middleware/roles.ts) und den Routen-Test.
// Die erste passende Regel gilt (spezifisch vor allgemein). Öffentliche Routen (routePolicy.ts) kommen hier nie an.
// Neue Routen unter einem bekannten Präfix erben dessen Rolle. Eine Route ganz ohne Regel verlangt "owner" (im Zweifel weniger Rechte) und fällt im Routen-Test auf.
export interface RoleRule { prefix?: string; pattern?: RegExp; methods?: string[]; role: RoleNeed; note: string }

export const ROLE_RULES: RoleRule[] = [
  // ── Plattform-Betreiber (Cognito-Gruppe admins; die Handler prüfen es zusätzlich selbst) ──
  { prefix: '/api/licenses/my', role: 'self', note: 'eigene Lizenz anzeigen' },
  { prefix: '/api/aws/s3-upload', role: 'self', note: 'Bild-Upload nutzen alle Konten (Profilbild, Kampagnenbilder); eigener Mandanten-Ordner, Tarif-Limits' },
  { prefix: '/api/admin', role: 'platform', note: 'Plattform-Verwaltung' },
  { prefix: '/api/aws', role: 'platform', note: 'AWS-Bereich des Betreibers' },
  { prefix: '/api/analytics/vitals-stats', role: 'platform', note: 'Plattform-Messwerte' },
  { prefix: '/api/licenses/portal', role: 'owner', note: 'Abrechnungsportal der Lizenz (Stripe) – gehört zur Abrechnung' },
  { pattern: /^\/api\/licenses(\/[^/]+)?$/, methods: ['GET', 'POST', 'PATCH', 'DELETE'], role: 'platform', note: 'Lizenzverwaltung (die Handler verlangen die Gruppe admins; GET auf einen Schlüssel ist öffentlich und kommt hier nie an)' },
  { pattern: /^\/api\/finance\/batch-dunning$/, role: 'platform', note: 'Sammel-Mahnlauf über alle Mandanten (der Handler verlangt die Gruppe admins)' },
  { pattern: /^\/api\/store\/branch-modules$/, methods: ['POST'], role: 'platform', note: 'Branchenpaket ohne Kauf zuweisen (der Handler verlangt die Gruppe admins)' },
  { pattern: /^\/api\/settings\/(agb|datenschutz)$/, role: 'platform', note: 'Rechtstexte der Plattform (Lesen ist öffentlich)' },
  { pattern: /^\/api\/settings\/(dunning|payment|testimonials)$/, role: 'platform', note: 'Plattform-Einstellungen (global)' },

  // ── jedes angemeldete Konto ──
  { prefix: '/api/drafts', role: 'self', note: 'eigene Entwürfe' },
  { prefix: '/api/notifications', role: 'self', note: 'eigene Benachrichtigungen' },
  { prefix: '/api/portal', role: 'self', note: 'Kundenportal (eigene Dokumente)' },
  { prefix: '/api/plan', role: 'self', note: 'eigener Tarif und Verbrauch' },
  { prefix: '/api/team/role', role: 'self', note: 'eigene Rolle (für Menü und Seitenschutz)' },
  { pattern: /^\/api\/team\/(accept|invite-preview)$/, role: 'self', note: 'Einladung ansehen/annehmen muss jedes angemeldete Konto können, auch ohne Mandant' },
  { pattern: /^\/api\/settings\/(account|modules|session|theme)$/, role: 'self', note: 'eigenes Konto, eigene Darstellung und Sitzung' },

  // ── nur der Inhaber ──
  { prefix: '/api/team', role: 'owner', note: 'Team verwalten' },
  { prefix: '/api/backup', role: 'owner', note: 'Sicherung der Mandantendaten' },
  { prefix: '/api/billing', role: 'owner', note: 'Abrechnung' },
  { pattern: /^\/api\/store\/checkout$/, role: 'owner', note: 'Module kaufen' },
  { pattern: /^\/api\/settings\/ai-providers(-[a-z]+)?$/, role: 'owner', note: 'KI-Schlüssel verursachen Kosten (auch Modellliste und Verbindungstest)' },
  { prefix: '/api/settings/mail-templates', role: 'owner', note: 'Einladungsvorlage (der Handler verlangt den Inhaber)' },
  { pattern: /^\/api\/settings\/branch-packages$/, methods: ['POST'], role: 'owner', note: 'Branchenpakete (de)aktivieren' },

  // ── Mitglied und höher ──
  { prefix: '/api/contacts', role: 'member', note: 'Kontakte (CRM)' }, { prefix: '/api/companies', role: 'member', note: 'Firmen (CRM)' }, { prefix: '/api/deals', role: 'member', note: 'Deals (CRM)' },
  { prefix: '/api/support', role: 'member', note: 'Support-Tickets' }, { prefix: '/api/projects', role: 'member', note: 'Projekte' },
  { prefix: '/api/forms', role: 'member', note: 'Formulare (Kampagnen brauchen ein Formular)' }, { prefix: '/api/marketing', role: 'member', note: 'Marketing' }, { prefix: '/api/campaigns', role: 'member', note: 'Kampagnenvorlagen' },
  { prefix: '/api/termine/bookings', role: 'member', note: 'Buchungen' }, { prefix: '/api/termine/types', role: 'member', note: 'Termintypen' },

  // ── Admin und höher: alles Übrige in den Modulen und Einstellungen ──
  { prefix: '/api/termine', role: 'admin', note: 'Termin-Einstellungen und Google-Kalender' },
  { prefix: '/api/settings', role: 'admin', note: 'Einstellungen des Mandanten' },
  { prefix: '/api/store', role: 'admin', note: 'Modul-Store ansehen' },
  { prefix: '/api/finance', role: 'admin', note: 'Finanzen' }, { prefix: '/api/articles', role: 'admin', note: 'Artikelkatalog' }, { prefix: '/api/contracts', role: 'admin', note: 'Verträge' }, { prefix: '/api/hr', role: 'admin', note: 'Personal (HR)' },
  { prefix: '/api/newsletter', role: 'admin', note: 'Newsletter (Massenmails)' }, { prefix: '/api/sequences', role: 'admin', note: 'Sequenzen (Massenmails)' }, { prefix: '/api/automations', role: 'admin', note: 'Automatisierungen' },
  { prefix: '/api/shop', role: 'admin', note: 'Webshop' }, { prefix: '/api/returns', role: 'admin', note: 'Retouren' }, { prefix: '/api/blog', role: 'admin', note: 'Blog der Website' }, { prefix: '/api/pages', role: 'admin', note: 'Seiten der Website' },
  { prefix: '/api/nexora', role: 'admin', note: 'Website' }, { prefix: '/api/services', role: 'admin', note: 'Leistungen' }, { prefix: '/api/video', role: 'admin', note: 'Video der Website' },
  { prefix: '/api/ai', role: 'admin', note: 'KI-Assistent führt Aktionen in allen Modulen aus und würde sonst die Sperren eines Mitglieds umgehen' },
  { prefix: '/api/mail-log', role: 'admin', note: 'Versandprotokoll' }, { prefix: '/api/plugins', role: 'admin', note: 'Plugin-Daten' },
  { prefix: '/api/automotive', role: 'admin', note: 'Branchenpaket der Branche' }, { prefix: '/api/workshop', role: 'admin', note: 'Branchenpaket der Branche' }, { prefix: '/api/praxis', role: 'admin', note: 'Branchenpaket (Patientendaten)' },
  { prefix: '/api/handwerk', role: 'admin', note: 'Branchenpaket der Branche' }, { prefix: '/api/gastro-', role: 'admin', note: 'Branchenpaket der Branche' }, { prefix: '/api/properties', role: 'admin', note: 'Branchenpaket der Branche' },
  { prefix: '/api/viewings', role: 'admin', note: 'Branchenpaket der Branche' }, { prefix: '/api/renters', role: 'admin', note: 'Branchenpaket der Branche' }, { prefix: '/api/retail', role: 'admin', note: 'Branchenpaket der Branche' },
]

export function findRoleRule(path: string, method = 'GET'): RoleRule | undefined {
  const p = path.split('?')[0]
  const m = method.toUpperCase()
  return ROLE_RULES.find(r => {
    if (r.methods && !r.methods.includes(m)) return false
    if (r.pattern) return r.pattern.test(p)
    return !!r.prefix && (p === r.prefix || p.startsWith(r.prefix.endsWith('-') ? r.prefix : r.prefix + '/'))
  })
}
export const needForRoute = (path: string, method = 'GET'): { need: RoleNeed; rule: boolean } => { const r = findRoleRule(path, method); return r ? { need: r.role, rule: true } : { need: 'owner', rule: false } }
