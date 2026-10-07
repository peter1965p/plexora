import type { ModuleNeed } from '../../shared/plans'

// Welche Route gehört zu welchem Modul bzw. Tarif? Eine Tabelle für die Middleware (server/middleware/plan.ts) und den Routen-Test.
// Die erste passende Regel gilt (spezifisch vor allgemein). Öffentliche Routen (routePolicy.ts) kommen hier nie an.
// Neue Routen unter einem bekannten Präfix erben dessen Modul. Eine Route ganz ohne Regel ist ein Fehler im Test und wird in der Middleware wie 'paid' behandelt.
// Plattform-Routen (aws, admin, licenses) prüfen die Gruppe "admins" im Handler selbst und gelten hier als 'none'.

export interface ModuleRule { prefix?: string; pattern?: RegExp; methods?: string[]; need: ModuleNeed; note: string }

const crm = { module: 'crm', free: true } as const

export const MODULE_RULES: ModuleRule[] = [
  // ── Grundfunktionen für jedes angemeldete Konto ──
  { prefix: '/api/settings/mail-templates', need: 'paid', note: 'Vorlage der Einladungsmail: gehört zur Team-Einladung, die Free nicht hat' },
  { prefix: '/api/settings', need: 'none', note: 'Einstellungen des eigenen Kontos' },
  { pattern: /^\/api\/team\/invite$/, methods: ['POST'], need: 'paid', note: 'Einladungen verschicken Mails und legen Konten an: nicht für Free' },
  { prefix: '/api/team', need: 'none', note: 'Einladung annehmen/ansehen muss für jedes Konto gehen (auch Free), Mitgliederliste, Entfernen' },
  { prefix: '/api/store', need: 'none', note: 'Kauf von Modulen muss ohne Lizenz möglich sein' },
  { prefix: '/api/billing', need: 'none', note: 'Abrechnungsportal' },
  { prefix: '/api/licenses', need: 'none', note: 'eigene Lizenz anzeigen; Verwaltung prüft die Gruppe admins im Handler' },
  { prefix: '/api/backup', need: 'none', note: 'Export der eigenen Daten ist ein Recht des Kontos (Datenschutz)' },
  { prefix: '/api/notifications', need: 'none', note: 'eigene Benachrichtigungen' },
  { prefix: '/api/drafts', need: 'none', note: 'eigene Entwürfe' },
  { prefix: '/api/portal', need: 'none', note: 'Kundenportal (eigene Dokumente)' },
  { prefix: '/api/aws', need: 'none', note: 'Plattform-Betreiber, Gruppe admins im Handler' },
  { prefix: '/api/admin', need: 'none', note: 'Plattform-Betreiber, Gruppe admins im Handler' },
  { prefix: '/api/internal', need: 'none', note: 'interne Aufrufe mit Secret' },
  { prefix: '/api/webhooks', need: 'none', note: 'Webhooks mit Signatur' },
  { prefix: '/api/public', need: 'none', note: 'öffentlich (routePolicy.ts)' },
  { prefix: '/api/pay', need: 'none', note: 'öffentlich (routePolicy.ts)' },
  { prefix: '/api/jobs', need: 'none', note: 'öffentlich (routePolicy.ts)' },
  { prefix: '/api/analytics', need: { module: 'analytics' }, note: 'Auswertungen' },

  // ── Zum Ausprobieren auch ohne Lizenz (mit Mengenbegrenzung) ──
  { prefix: '/api/contacts', need: crm, note: 'CRM' },
  { prefix: '/api/companies', need: crm, note: 'CRM' },
  { prefix: '/api/deals', need: crm, note: 'CRM' },
  { prefix: '/api/support', need: { module: 'support', free: true }, note: 'Support-Tickets' },
  { prefix: '/api/projects', need: { module: 'projects', free: true }, note: 'Projekte' },

  // ── Lizenzmodule ──
  { prefix: '/api/finance', need: { module: 'finance' }, note: 'Finanzen' },
  { prefix: '/api/articles', need: { module: 'finance' }, note: 'Artikelkatalog der Finanzen' },
  { prefix: '/api/contracts', need: { module: 'contracts' }, note: 'Verträge' },
  { prefix: '/api/hr', need: { module: 'hr' }, note: 'Personal' },
  { prefix: '/api/newsletter', need: { module: 'newsletter' }, note: 'Newsletter' },
  { prefix: '/api/shop', need: { module: 'shop' }, note: 'Webshop' },
  { prefix: '/api/returns', need: { module: 'shop' }, note: 'Retouren des Shops' },
  { prefix: '/api/forms', need: { module: 'forms' }, note: 'Formulare' },
  { prefix: '/api/marketing', need: { module: 'marketing' }, note: 'Kampagnen' },
  { prefix: '/api/campaigns', need: { module: 'marketing' }, note: 'Kampagnenvorlagen' },
  { prefix: '/api/sequences', need: { module: 'marketing' }, note: 'Sequenzen' },
  { prefix: '/api/automations', need: { module: 'marketing' }, note: 'Automatisierungen' },
  { prefix: '/api/termine', need: { module: ['marketing', 'nexora'] }, note: 'Terminbuchung gehört zu Kampagnen und Website' },
  { prefix: '/api/nexora', need: { module: 'nexora' }, note: 'Website' },
  { prefix: '/api/pages', need: { module: 'nexora' }, note: 'Seiten der Website' },
  { prefix: '/api/blog', need: { module: 'nexora' }, note: 'Blog' },
  { prefix: '/api/services', need: { module: 'nexora' }, note: 'Leistungen der Website' },
  { prefix: '/api/video', need: { module: 'nexora' }, note: 'Video der Website' },
  { prefix: '/api/ai', need: 'paid', note: 'KI-Assistent verursacht Kosten' },
  { prefix: '/api/mail-log', need: 'paid', note: 'Versandprotokoll' },
  { prefix: '/api/plugins', need: 'paid', note: 'Plugin-Daten' },

  // ── Branchenpakete ──
  { prefix: '/api/automotive', need: { branch: 'automotive' }, note: 'Branchenpaket Automotive' },
  { prefix: '/api/workshop', need: { branch: 'automotive' }, note: 'Werkstatt gehört zum Paket Automotive' },
  { prefix: '/api/praxis', need: { branch: 'praxis' }, note: 'Branchenpaket Praxis (Patientendaten)' },
  { prefix: '/api/handwerk', need: { branch: 'handwerk' }, note: 'Branchenpaket Handwerk' },
  { prefix: '/api/gastro-', need: { branch: 'gastro' }, note: 'Branchenpaket Gastronomie' },
  { prefix: '/api/properties', need: { branch: 'immobilien' }, note: 'Branchenpaket Immobilien' },
  { prefix: '/api/viewings', need: { branch: 'immobilien' }, note: 'Branchenpaket Immobilien' },
  { prefix: '/api/renters', need: { branch: 'immobilien' }, note: 'Branchenpaket Immobilien' },
  { prefix: '/api/retail', need: { branch: 'retail' }, note: 'Branchenpaket Retail' },
]

export function findModuleRule(path: string, method = 'GET'): ModuleRule | undefined {
  const p = path.split('?')[0]
  const m = method.toUpperCase()
  return MODULE_RULES.find(r => {
    if (r.methods && !r.methods.includes(m)) return false
    if (r.pattern) return r.pattern.test(p)
    // Präfix an Segmentgrenze (/api/hr trifft /api/hr/leave, nicht /api/hrx); Präfixe mit Bindestrich am Ende (gastro-) treffen jede Fortsetzung
    return !!r.prefix && (p === r.prefix || p.startsWith(r.prefix.endsWith('-') ? r.prefix : r.prefix + '/'))
  })
}
