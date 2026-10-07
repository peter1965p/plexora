import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { AREA_ROLES, areaForPath, roleVisible, roleAllows, ROLE_RANK, type Role } from '../../shared/roles'
import { needForRoute } from '../../server/utils/rolePolicy'
import { shouldRedirectToLogin } from '../../app/utils/apiAuth'

describe('Oberfläche: Rollen', () => {
  it('Seitenpfade werden Bereichen zugeordnet (an der Segmentgrenze)', () => {
    expect(areaForPath('/finance')?.area).toBe('Finanzen'); expect(areaForPath('/finance?tab=catalog')?.area).toBe('Finanzen'); expect(areaForPath('/hr/leave')?.area).toBe('HR')
    expect(areaForPath('/crm')?.role).toBe('member'); expect(areaForPath('/financeX')).toBeNull(); expect(areaForPath('/dashboard')).toBeNull(); expect(areaForPath('/profile')).toBeNull(); expect(areaForPath('/kein-zugriff')).toBeNull()
  })
  it('jeder Menüpunkt der Seitenleiste ist einem Bereich zugeordnet oder bewusst für alle (Dashboard, Profil)', () => {
    const src = readFileSync('app/components/AppSidebar.vue', 'utf8')
    const fixed = [...src.matchAll(/\{ to: '([^'?]+)'/g)].map(m => m[1])
    const dynamic = Object.values(Object.fromEntries([...src.matchAll(/(\w+): '(\/[a-z-]+)'/g)].map(m => [m[1], m[2]])))
    const targets = [...new Set([...fixed, ...dynamic])].filter(p => !['/dashboard'].includes(p))
    const unmapped = targets.filter(p => !areaForPath(p) && !p.startsWith('/plugins') && !p.startsWith('/website'))
    expect(unmapped, `Menüpunkte ohne Eintrag in AREA_ROLES (shared/roles.ts): ${unmapped.join(', ')}`).toEqual([])
    expect(targets.length).toBeGreaterThan(12)
  })
  it('die Oberfläche verlangt nie eine NIEDRIGERE Rolle als der Server für die Hauptschnittstelle der Seite (sonst klickt man auf etwas, das nur scheitert)', () => {
    const MAIN: Record<string, string> = {
      '/crm': '/api/contacts', '/support': '/api/support', '/projects': '/api/projects', '/termine': '/api/termine/bookings', '/marketing': '/api/marketing', '/forms': '/api/forms',
      '/finance': '/api/finance', '/contracts': '/api/contracts', '/hr': '/api/hr', '/shop-admin': '/api/shop', '/newsletter': '/api/newsletter/campaigns', '/blog': '/api/blog',
      '/automotive': '/api/automotive/vehicles', '/immobilien': '/api/properties', '/gastro': '/api/gastro-orders', '/handwerk': '/api/handwerk/jobs', '/praxis': '/api/praxis/patients',
      '/retail': '/api/retail/stock', '/rechnungs-design': '/api/settings/invoice-template', '/settings': '/api/settings/invoice', '/store': '/api/store/checkout',
    }
    for (const a of AREA_ROLES) {
      const api = MAIN[a.prefix]; if (!api) continue
      const server = needForRoute(api, 'GET').need
      expect(ROLE_RANK[a.role], `${a.prefix} (UI ${a.role}) < ${api} (Server ${server})`).toBeGreaterThanOrEqual(ROLE_RANK[server])
    }
  })
  it('Ausblenden nur, wenn der Server durchsetzt UND die Rolle bekannt ist', () => {
    expect(roleVisible({ enforced: false, role: 'member' }, 'admin')).toBe(true); expect(roleVisible({ enforced: true, role: '' }, 'admin')).toBe(true)
    expect(roleVisible({ enforced: true, role: 'member' }, 'admin')).toBe(false); expect(roleVisible({ enforced: true, role: 'admin' }, 'admin')).toBe(true); expect(roleVisible({ enforced: true, role: 'member' }, 'self')).toBe(true)
    for (const r of ['member', 'admin', 'owner', 'platform'] as Role[]) expect(roleVisible({ enforced: true, role: r }, 'platform')).toBe(r === 'platform')
    expect(roleAllows('owner', 'admin')).toBe(true)
  })
  it('403 (Rolle) führt nie zur Anmeldeseite, nur ein abgelaufenes Token (401) tut das', () => {
    expect(shouldRedirectToLogin(403, 'Dafür brauchst du die Rolle Admin.', true, '/finance')).toBe(false); expect(shouldRedirectToLogin(401, 'Anmeldung erforderlich', true, '/finance')).toBe(true)
  })
  it('Seite "Kein Zugriff": Rolle und Bereich aus der Adresse werden gegen eine feste Liste geprüft und gekürzt, kein v-html', () => {
    const p = readFileSync('app/pages/kein-zugriff.vue', 'utf8')
    expect(p).toContain('Object.hasOwn(ROLE_LABELS'); expect(p).toContain('.slice(0, 40)'); expect(p).not.toContain('v-html'); expect(p).toContain('Zum Dashboard')
  })
  it('Seitenschutz ist als globale Routen-Middleware verdrahtet und leitet auf /kein-zugriff', () => {
    const m = readFileSync('app/middleware/role.global.ts', 'utf8'); expect(m).toContain("path: '/kein-zugriff'"); expect(m).toContain('areaForPath'); expect(m).toContain('import.meta.server')
  })
  it('Team-Seite nennt die Rollen mit Beschreibung und kann die Rolle ändern (PATCH)', () => {
    const s = readFileSync('app/pages/settings/index.vue', 'utf8'); expect(s).toContain('CRM, Support, Projekte, Termine, Marketing und Formulare'); expect(s).toMatch(/method: 'PATCH'[^}]*body: \{ role \}/)
  })
})
