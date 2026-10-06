// Preisliste des Stores: der Server ist die einzige Quelle der Wahrheit. Preise aus dem Request werden nie verwendet.
// - eingebaute Module: Konstante unten (muss mit app/pages/store.vue übereinstimmen, ein Test prüft das)
// - Plugin-/Branchen-Module: Tabelle plexora-plugin-registry (Preise legt ein Admin über /api/store/branch-modules an)

export const BUILTIN_MODULES: Record<string, { name: string; priceEur: number }> = {
  crm:        { name: 'CRM',                   priceEur: 9 },
  finance:    { name: 'Finanzen',              priceEur: 12 },
  projects:   { name: 'Projekte',              priceEur: 10 },
  hr:         { name: 'HR',                    priceEur: 10 },
  support:    { name: 'Support',               priceEur: 8 },
  marketing:  { name: 'Marketing',             priceEur: 14 },
  shop:       { name: 'Shop',                  priceEur: 15 },
  forms:      { name: 'Formulare',             priceEur: 7 },
  nexora:     { name: 'Unternehmens-Webseite', priceEur: 19 },
  termine:    { name: 'Termine',               priceEur: 15 },
  newsletter: { name: 'Newsletter',            priceEur: 12 },
}

export const MAX_MODULE_PRICE_EUR = 10_000

export interface CatalogEntry { key: string; name: string; priceEur: number; source: 'builtin' | 'registry' }
export type RegistryLookup = (key: string) => Promise<{ name?: unknown; price?: unknown } | null | undefined>

export const toCents = (eur: number) => Math.round(eur * 100)

/** Liefert den kaufbaren Katalogeintrag oder null (unbekannt, nicht kaufbar, Preis ungültig). */
export async function getCatalogEntry(moduleKey: unknown, lookup: RegistryLookup): Promise<CatalogEntry | null> {
  const key = String(moduleKey ?? '').trim().toLowerCase()
  if (!/^[a-z0-9-]{1,40}$/.test(key)) return null
  if (Object.hasOwn(BUILTIN_MODULES, key)) {
    const b = BUILTIN_MODULES[key]
    return { key, name: b.name, priceEur: b.priceEur, source: 'builtin' }
  }
  const item = await lookup(key)
  if (!item) return null
  const price = Number(item.price)
  if (!Number.isFinite(price) || price <= 0 || price > MAX_MODULE_PRICE_EUR) return null
  return { key, name: String(item.name || key).slice(0, 80), priceEur: Math.round(price * 100) / 100, source: 'registry' }
}

export interface PaidSession {
  payment_status?: string | null
  currency?: string | null
  amount_subtotal?: number | null   // Summe der Positionen VOR Rabatten und Steuern
  amount_total?: number | null      // Endbetrag nach Rabatten/Steuern (wird bewusst nicht verglichen)
}

// 'paid' = bezahlt; 'no_payment_required' = Rabatt bis 0 EUR (z. B. 100-Prozent-Gutschein), der Auftrag stammt dann
// trotzdem aus unserer Sitzung mit Katalogpreis. 'unpaid' (Zahlung noch offen) schaltet nichts frei.
const ACCEPTED_PAYMENT_STATUS = ['paid', 'no_payment_required']

/**
 * Prüfung im Stripe-Webhook, bevor ein Modul freigeschaltet wird:
 * bezahlt (oder 100 % Rabatt), Währung EUR, Betrag vor Rabatten und Steuern gleich dem aktuellen Katalogpreis.
 * Rabatte und Steuern ändern amount_total, nicht amount_subtotal, und führen deshalb nicht zur Ablehnung.
 */
export function verifyModulePurchase(session: PaidSession, entry: CatalogEntry | null): { ok: true } | { ok: false; reason: string } {
  if (!entry) return { ok: false, reason: 'Modul nicht im Katalog' }
  if (!ACCEPTED_PAYMENT_STATUS.includes(session.payment_status || '')) return { ok: false, reason: `Zahlungsstatus ${session.payment_status ?? 'unbekannt'}` }
  if ((session.currency || '').toLowerCase() !== 'eur') return { ok: false, reason: `Währung ${session.currency ?? 'unbekannt'}` }
  const expected = toCents(entry.priceEur)
  if (session.amount_subtotal !== expected) return { ok: false, reason: `Betrag ${session.amount_subtotal ?? 'fehlt'} Cent, Katalog ${expected} Cent` }
  return { ok: true }
}
