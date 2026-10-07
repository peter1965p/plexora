// Tarife und Limits an EINER Stelle: Server (Middleware, Mail-Zähler, Upload), Oberfläche und Tests lesen dieselben Werte.
// Der Tarif eines Mandanten kommt serverseitig aus plexora-licenses (siehe server/utils/tenantPlan.ts), nie aus der Anfrage.

export const PLAN_KEYS = ['free', 'starter', 'pro', 'enterprise'] as const
export type PlanKey = typeof PLAN_KEYS[number]

/** Rang für "mindestens dieser Tarif" */
export const PLAN_RANK: Record<PlanKey, number> = { free: 0, starter: 1, pro: 2, enterprise: 3 }

export const PLAN_LABELS: Record<PlanKey, string> = { free: 'Free', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' }

/** Module, die ein Lizenz-Tarif enthält, falls die Lizenz selbst keine Modulliste trägt (Spiegel von TIER_MODULES in server/utils/license.ts, per Test gleich gehalten) */
export const TIER_FALLBACK_MODULES: Record<string, string[]> = {
  starter:    ['crm', 'support', 'nexora', 'finance', 'marketing', 'forms'],
  pro:        ['crm', 'support', 'finance', 'projects', 'contracts', 'hr', 'analytics', 'shop', 'forms', 'marketing', 'nexora', 'newsletter'],
  enterprise: ['crm', 'support', 'finance', 'projects', 'contracts', 'hr', 'analytics', 'shop', 'forms', 'marketing', 'nexora', 'newsletter'],
}

/** Module, die auch ein Konto ohne Lizenz nutzen darf (zum Ausprobieren, mit Mengenbegrenzung, siehe records) */
export const FREE_MODULES = ['crm', 'projects', 'support'] as const

export interface PlanLimits {
  /** Systemmails (Bestätigung, Rechnung, Einladung, Mahnung) je Mandant und Tag */
  mailSystemPerDay: number
  /** Massen-/Marketingmails (Kampagne, Newsletter, Follow-up) je Mandant und Tag */
  mailBulkPerDay: number
  /** höchstens so viele Mails je Tag an dieselbe Adresse aus einem Mandanten */
  mailPerRecipientPerDay: number
  /** Datei höchstens (Bytes) */
  uploadMaxBytes: number
  uploadsPerDay: number
  uploadsPerHour: number
  /** Gesamtspeicher je Mandant (Bytes) */
  storageBytes: number
  /** Höchstzahl Datensätze je Bereich (nur Free), null = unbegrenzt */
  records: Record<string, number> | null
}

const MB = 1024 * 1024
export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free:       { mailSystemPerDay: 5,    mailBulkPerDay: 0,    mailPerRecipientPerDay: 3, uploadMaxBytes: 1 * MB, uploadsPerDay: 5,    uploadsPerHour: 20, storageBytes: 5 * MB,          records: { crm: 50, projects: 25, support: 25 } },
  starter:    { mailSystemPerDay: 100,  mailBulkPerDay: 200,  mailPerRecipientPerDay: 3, uploadMaxBytes: 5 * MB, uploadsPerDay: 100,  uploadsPerHour: 20, storageBytes: 500 * MB,        records: null },
  pro:        { mailSystemPerDay: 500,  mailBulkPerDay: 1000, mailPerRecipientPerDay: 3, uploadMaxBytes: 8 * MB, uploadsPerDay: 500,  uploadsPerHour: 20, storageBytes: 5 * 1024 * MB,   records: null },
  enterprise: { mailSystemPerDay: 2000, mailBulkPerDay: 5000, mailPerRecipientPerDay: 3, uploadMaxBytes: 8 * MB, uploadsPerDay: 1000, uploadsPerHour: 20, storageBytes: 20 * 1024 * MB,  records: null },
}

/** Was ein Mandant tatsächlich hat: Tarif aus der aktiven Lizenz plus die Module dieser Lizenz */
export interface PlanInfo {
  plan: PlanKey
  /** Betreiber (Cognito-Gruppe admins) und Demo-Konto sind von den Limits ausgenommen */
  exempt: 'platform' | 'demo' | null
  modules: string[]
  /** installierte Branchen-Pakete des Mandanten (Status active); die Installation selbst wird beim Installieren geprüft (branchAccess.ts) */
  branches?: string[]
}

/**
 * Was eine Route verlangt:
 *  'none'      Grundfunktion für jedes angemeldete Konto (Konto, Einstellungen, Kauf, Sicherung, Einladung annehmen …)
 *  'free'      Bereich, den auch Free nutzen darf (mit Mengenbegrenzung), sonst das genannte Modul der Lizenz
 *  'paid'      jede aktive Lizenz
 *  module      eines dieser Lizenzmodule (free: auch ohne Lizenz erlaubt, siehe FREE_MODULES)
 *  branch      Branchen-Paket: jede aktive Lizenz ODER dieses Paket ist beim Mandanten installiert (kostenlose Pakete haben keine Lizenz)
 */
export type ModuleNeed = 'none' | 'paid' | { module: string | string[]; free?: boolean } | { branch: string }

export function planAllows(info: PlanInfo, need: ModuleNeed): boolean {
  if (info.exempt) return true
  if (need === 'none') return true
  if (need === 'paid') return info.plan !== 'free'
  if ('branch' in need) return info.plan !== 'free' || (info.branches || []).includes(need.branch)
  const wanted = Array.isArray(need.module) ? need.module : [need.module]
  if (need.free && info.plan === 'free') return wanted.some(m => (FREE_MODULES as readonly string[]).includes(m))
  return wanted.some(m => info.modules.includes(m))
}

/** Zahlen für Meldungen: 1048576 -> "1 MB" */
export function formatBytes(n: number): string {
  if (n >= 1024 * MB) return `${Math.round(n / (1024 * MB))} GB`
  if (n >= MB) return `${Math.round(n / MB)} MB`
  return `${Math.round(n / 1024)} KB`
}

/** Den Tarif aus den Lizenzen eines Mandanten bestimmen (nur aktive, nicht abgelaufene). Reine Funktion für Tests. */
export function planFromLicenses(licenses: Array<{ tier?: string; status?: string; validUntil?: string | null; modules?: unknown }>, now = Date.now()): { plan: PlanKey; modules: string[] } {
  let best: PlanKey = 'free'
  const modules = new Set<string>()
  for (const l of licenses || []) {
    if (!l || l.status !== 'active') continue
    if (l.validUntil && !Number.isNaN(new Date(l.validUntil).getTime()) && new Date(l.validUntil).getTime() < now) continue
    // Unbekannte Stufe in einer aktiven Lizenz (z. B. Sonderlizenz): mindestens Starter, damit zahlende Kunden nie auf Free fallen
    const raw = String(l.tier || '').toLowerCase()
    const tier = Object.hasOwn(PLAN_RANK, raw) && raw !== 'free' ? raw : 'starter'
    if (PLAN_RANK[tier as PlanKey] > PLAN_RANK[best]) best = tier as PlanKey
    const own = l.modules instanceof Set ? Array.from(l.modules as Set<string>) : (Array.isArray(l.modules) ? l.modules : [])
    const list = own.length ? own : (TIER_FALLBACK_MODULES[tier] || [])
    for (const m of list) modules.add(String(m).toLowerCase())
  }
  return { plan: best, modules: Array.from(modules) }
}
