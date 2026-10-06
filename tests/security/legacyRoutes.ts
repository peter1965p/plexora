// ALTLAST: Routen, die heute noch ohne Anmeldung im Code erreichbar sind (Rückfall auf 'demo-user').
// Diese Liste darf nur SCHRUMPFEN: Wird eine Route abgesichert (oder in routePolicy.ts als öffentlich begründet),
// muss ihr Eintrag hier gelöscht und LEGACY_MAX gesenkt werden (der Test erzwingt das). Neue Einträge sind nicht erlaubt.
// Stand 07.10.2026: abgebaut wird in Block b2 (Verwaltungsrouten) und Block d (Rückfall je Modul).
export const LEGACY_MAX = 15

export const LEGACY_ROUTES: string[] = [
  'POST /api/hr/campaigns',
  'POST /api/hr',
  'POST /api/hr/leave',
  'GET /api/hr/stempel',
  'POST /api/hr/stempel',
  'POST /api/hr/timelog',
  'POST /api/marketing/[id]/preview-email',
  'POST /api/marketing',
  'POST /api/pages',
  'POST /api/settings/branding',
  'POST /api/settings/company',
  'GET /api/settings/invoice-template',
  'PUT /api/settings/invoice-template',
  'PATCH /api/shop/products/[id]',
  'POST /api/shop/products',
]
