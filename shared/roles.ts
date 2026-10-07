// Rollen im Mandanten (Inhaber, Admin, Mitglied) plus Plattform-Betreiber. Eine Quelle für Server (Middleware) und Oberfläche (Menü, "Kein Zugriff").
export type Role = 'member' | 'admin' | 'owner' | 'platform'
/** was eine Route verlangt: 'self' = jedes angemeldete Konto, sonst die Mindestrolle */
export type RoleNeed = 'self' | Role

export const ROLE_RANK: Record<RoleNeed, number> = { self: 0, member: 1, admin: 2, owner: 3, platform: 4 }
export const ROLE_LABELS: Record<Role, string> = { member: 'Mitglied', admin: 'Admin', owner: 'Inhaber', platform: 'Plattform-Betreiber' }
export const ROLE_DESCRIPTIONS: Record<'member' | 'admin', string> = {
  member: 'CRM, Support, Projekte, Termine, Marketing und Formulare',
  admin: 'Alles außer Team, Sicherung, Abrechnung und Zahlungs-/KI-Schlüssel',
}
export const roleAllows = (role: Role, need: RoleNeed) => ROLE_RANK[role] >= ROLE_RANK[need]

/** Seitenbereich -> Mindestrolle (Oberfläche: Menüpunkte und Seitenschutz; der Server bleibt maßgeblich) */
export const AREA_ROLES: Array<{ prefix: string; area: string; role: RoleNeed }> = [
  { prefix: '/crm', area: 'CRM', role: 'member' }, { prefix: '/support', area: 'Support', role: 'member' }, { prefix: '/projects', area: 'Projekte', role: 'member' },
  { prefix: '/termine', area: 'Termine', role: 'member' }, { prefix: '/marketing', area: 'Marketing', role: 'member' }, { prefix: '/forms', area: 'Formulare', role: 'member' },
  { prefix: '/finance', area: 'Finanzen', role: 'admin' }, { prefix: '/contracts', area: 'Verträge', role: 'admin' }, { prefix: '/hr', area: 'HR', role: 'admin' },
  { prefix: '/shop-admin', area: 'Shop', role: 'admin' }, { prefix: '/newsletter', area: 'Newsletter', role: 'admin' }, { prefix: '/blog', area: 'Blog', role: 'admin' },
  { prefix: '/automotive', area: 'Automotive', role: 'admin' }, { prefix: '/immobilien', area: 'Immobilien', role: 'admin' }, { prefix: '/gastro', area: 'Gastronomie', role: 'admin' },
  { prefix: '/handwerk', area: 'Handwerk', role: 'admin' }, { prefix: '/praxis', area: 'Praxis', role: 'admin' }, { prefix: '/retail', area: 'Einzelhandel', role: 'admin' },
  { prefix: '/rechnungs-design', area: 'Rechnungs-Design', role: 'admin' }, { prefix: '/analytics', area: 'Analytics', role: 'admin' }, { prefix: '/seo', area: 'SEO / GEO', role: 'admin' },
  { prefix: '/settings', area: 'Einstellungen', role: 'admin' }, { prefix: '/store', area: 'Modul-Store', role: 'owner' },
]
export function areaForPath(path: string) {
  const p = path.split('?')[0]
  return AREA_ROLES.find(a => p === a.prefix || p.startsWith(a.prefix + '/')) || null
}

/** Darf die Oberfläche etwas mit dieser Mindestrolle zeigen? Solange die Rolle unbekannt ist oder der Server die Rollen nicht durchsetzt: ja (nichts ausblenden). */
export const roleVisible = (st: { enforced: boolean; role: '' | Role }, need: RoleNeed) => !st.enforced || !st.role || roleAllows(st.role, need)
