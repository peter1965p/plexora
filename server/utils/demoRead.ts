import { requireAuth, type AuthUser } from './verifyAuth'
import { isDemoAccount } from './mailGuard'

// Das öffentlich bekannte Demo-Konto darf die Plattform-Einstellungen des Betreibers ANSEHEN, aber nie ändern.
// Gelesen werden darf nur, was keine Geheimnisse und keine Kundendaten enthält: Einstellungen der Startseite, Mahnwesen-Vorlagen, Testimonials, Payment (nur "ist eingerichtet", ohne Schlüssel und Adressen),
// Besucherzahlen ohne IP-Adressen. NICHT freigegeben: AWS-Bereich, Lizenzverwaltung (Kundendaten), Datenintegrität (alle Mandanten), Sammel-Mahnlauf, Schreibzugriffe aller Art.
export const DEMO_READ_ROUTES: RegExp[] = [
  /^\/api\/settings\/(dunning|payment|testimonials|landing-theme|landing-packages)$/,
  /^\/api\/admin\/(demo-stats|seo-stats)$/,
  /^\/api\/analytics\/vitals-stats$/,
]

/** Darf das Demo-Konto diese Anfrage als Lesezugriff auf eine Betreiber-Seite bekommen? (nur GET/HEAD und nur die Liste oben) */
export function isDemoReadAllowed(auth: Pick<AuthUser, 'email' | 'groups'> | undefined, method: string, path: string): boolean {
  if (!auth || !isDemoAccount(auth)) return false
  const m = method.toUpperCase()
  return (m === 'GET' || m === 'HEAD') && DEMO_READ_ROUTES.some(r => r.test(path.split('?')[0]))
}

/** Wie requireAdmin, lässt aber das Demo-Konto lesen. demo = true, wenn es das Demo-Konto ist (der Handler liefert dann nur die unkritische Sicht). */
export function requireAdminOrDemoRead(event: any): { auth: AuthUser; demo: boolean } {
  const auth = requireAuth(event)
  if (auth.groups.includes('admins')) return { auth, demo: false }
  if (isDemoReadAllowed(auth, event.method || event.node?.req?.method || 'GET', event.path || '')) return { auth, demo: true }
  throw createError({ statusCode: 403, message: 'Nur für Admins' })
}
