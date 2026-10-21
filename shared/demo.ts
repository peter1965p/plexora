// Demo-Konten: das öffentliche Konto demo@plexora.eu (Ausgangskonto, "Lobby" und Vorlage) und ein Pool von zehn weiteren Konten demo01 bis demo10.
// Jeder Besucher bekommt ein freies Konto aus dem Pool und arbeitet damit in seiner eigenen Kopie der Demo-Daten (siehe server/utils/demoSandbox.ts).
export const DEMO_BASE_EMAIL = 'demo@plexora.eu'
export const DEMO_BASE_TENANT = 'PLXR-DEMO-0000-0000-DEMO'
export const DEMO_POOL_SIZE = 10
const nn = (n: number) => String(n).padStart(2, '0')
export const DEMO_POOL: string[] = Array.from({ length: DEMO_POOL_SIZE }, (_, i) => `demo${nn(i + 1)}@plexora.eu`)
export const DEMO_ACCOUNTS: string[] = [DEMO_BASE_EMAIL, ...DEMO_POOL]
const norm = (e?: string | null) => String(e ?? '').trim().toLowerCase()
export const isDemoEmail = (e?: string | null) => DEMO_ACCOUNTS.includes(norm(e))
export const isPoolEmail = (e?: string | null) => DEMO_POOL.includes(norm(e))
/** Nexora-Mandanten-ID des Demo-Kontos: Ausgangskonto fest, Poolkonten …-D01 bis …-D10 */
export const demoTenantId = (e: string): string => { const m = /^demo(\d{2})@plexora\.eu$/.exec(norm(e)); return m && isPoolEmail(e) ? `PLXR-DEMO-0000-0000-D${m[1]}` : DEMO_BASE_TENANT }
/** Kennung (01 bis 10) eines Poolkontos, sonst '' */
export const demoSlot = (e: string): string => (isPoolEmail(e) ? norm(e).slice(4, 6) : '')
