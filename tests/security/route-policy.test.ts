import { describe, it, expect } from 'vitest'
import { listRoutes, classify, concretePath, type RouteInfo } from './routeScan'
import { LEGACY_ROUTES, LEGACY_MAX } from './legacyRoutes'
import { PUBLIC_RULES, isPublicRoute } from '../../server/utils/routePolicy'

const routes = listRoutes()

describe('Routen-Politik: jede API-Route hat eine Entscheidung', () => {
  const result = classify(routes, new Set(LEGACY_ROUTES))

  it('jede Route verlangt eine Anmeldung oder steht in der Allowlist (server/utils/routePolicy.ts) oder in der Altlast-Liste', () => {
    expect(result.undecided, `Routen ohne Auth-Entscheidung – Anmeldung (requireAuth o. ä.) einbauen oder mit Begründung in routePolicy.ts eintragen:\n${result.undecided.join('\n')}`).toEqual([])
  })

  it('die Altlast-Liste darf nur schrumpfen: erledigte Einträge müssen entfernt werden, es kommen keine neuen dazu', () => {
    expect(result.staleLegacy, `Veraltete Altlast-Einträge entfernen:\n${result.staleLegacy.join('\n')}`).toEqual([])
    expect(LEGACY_ROUTES.length, 'Altlast-Liste ist größer als der festgeschriebene Höchstwert – nichts Neues hinzufügen, nur abbauen (LEGACY_MAX senken)').toBeLessThanOrEqual(LEGACY_MAX)
    expect(new Set(LEGACY_ROUTES).size).toBe(LEGACY_ROUTES.length)
  })

  it('der Test erkennt Routen insgesamt (Plausibilität)', () => {
    expect(routes.length).toBeGreaterThan(300)
    expect(result.counts.auth).toBeGreaterThan(200)
  })
})

describe('Allowlist', () => {
  it('jede Regel hat eine ausreichende Begründung', () => {
    for (const r of PUBLIC_RULES) expect((r.reason || '').trim().length, JSON.stringify(r.prefix || String(r.pattern))).toBeGreaterThan(15)
  })
  it('geschützte Verwaltungsrouten sind nicht versehentlich öffentlich', () => {
    for (const [p, m] of [['/api/team/x', 'DELETE'], ['/api/team/members', 'GET'], ['/api/settings/invoice', 'GET'], ['/api/finance', 'POST'], ['/api/contacts', 'GET'], ['/api/licenses/my', 'GET'], ['/api/settings/ai-providers', 'POST']] as const)
      expect(isPublicRoute(p, m), `${m} ${p}`).toBe(false)
  })
})

describe('Gegenprobe: der Test bricht bei einer neuen Route ohne Entscheidung', () => {
  const dummy = (over: Partial<RouteInfo>): RouteInfo => ({ key: 'GET /api/neu/[id]', method: 'GET', path: '/api/neu/[id]', file: 'server/api/neu/[id].get.ts', auth: false, ...over })

  it('Dummy-Route ohne Anmeldung und ohne Allowlist wird als "ohne Entscheidung" gemeldet', () => {
    expect(classify([dummy({})], new Set()).undecided).toEqual(['GET /api/neu/[id]'])
  })
  it('mit Anmeldung oder Allowlist-Eintrag oder Altlast ist sie entschieden', () => {
    expect(classify([dummy({ auth: true })], new Set()).undecided).toEqual([])
    expect(classify([dummy({ key: 'GET /api/public/x/y', path: '/api/public/[t]/y' })], new Set()).undecided).toEqual([])
    expect(classify([dummy({})], new Set(['GET /api/neu/[id]'])).undecided).toEqual([])
  })
  it('Altlast-Eintrag, der inzwischen erledigt ist, fällt auf; ebenso ein Eintrag zu einer gelöschten Route', () => {
    expect(classify([dummy({ auth: true })], new Set(['GET /api/neu/[id]'])).staleLegacy).toHaveLength(1)
    expect(classify([dummy({})], new Set(['GET /api/neu/[id]', 'GET /api/weg'])).staleLegacy).toEqual(['GET /api/weg (Route existiert nicht mehr)'])
  })
  it('Methode zählt: öffentlich per GET heißt nicht öffentlich per POST', () => {
    expect(isPublicRoute(concretePath('/api/settings/agb'), 'GET')).toBe(true)
    expect(isPublicRoute(concretePath('/api/settings/agb'), 'POST')).toBe(false)
  })
})
