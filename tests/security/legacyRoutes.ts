// ALTLAST: Routen, die heute noch ohne Anmeldung im Code erreichbar sind (Rückfall auf 'demo-user').
// Diese Liste darf nur SCHRUMPFEN: Wird eine Route abgesichert (oder in routePolicy.ts als öffentlich begründet),
// muss ihr Eintrag hier gelöscht und LEGACY_MAX gesenkt werden (der Test erzwingt das). Neue Einträge sind nicht erlaubt.
// Stand 07.10.2026: abgebaut wird in Block b2 (Verwaltungsrouten) und Block d (Rückfall je Modul).
export const LEGACY_MAX = 0

export const LEGACY_ROUTES: string[] = [
]
