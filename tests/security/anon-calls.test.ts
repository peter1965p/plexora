import { describe, it, expect, beforeAll } from 'vitest'
import { routeFiles, setupAnonEnv, callAnonymously } from './routeCall'
import { isPublicRoute } from '../../server/utils/routePolicy'
import { concretePath } from './routeScan'

const glob = import.meta.glob('../../server/api/**/*.ts')
const routes = routeFiles(glob)
beforeAll(() => { setupAnonEnv() })

describe('Jede geschützte Route, wirklich aufgerufen ohne Token: 401 und keine Nebenwirkung', () => {
  const protectedRoutes = routes.filter(r => !isPublicRoute(concretePath(r.urlPath), r.method))
  it('Plausibilität: über 300 geschützte Routen werden aufgerufen', () => { expect(protectedRoutes.length).toBeGreaterThan(300) })

  const bad: string[] = []
  it('keine geschützte Route antwortet, stürzt ab (500) oder lässt etwas anderes als 401/403 zu; vor der Prüfung gibt es keine Schreib-, Mail-, Netz- oder AWS-Zugriffe', async () => {
    for (const r of protectedRoutes) {
      const o = await callAnonymously(r)
      if (o.ok) continue
      if (o.kind === 'kein-handler') bad.push(`${r.key}: keine Standardfunktion`)
      else if (o.kind === 'antwortet') bad.push(`${r.key}: antwortet ohne Token`)
      else if (o.status !== 401 && o.status !== 403) bad.push(`${r.key}: Status ${o.status ?? 'unbekannt'} (${o.msg}) statt 401`)
      else bad.push(`${r.key}: Nebenwirkung vor der Prüfung: ${o.sideEffects.join(', ')}`)
    }
    expect(bad, `\n${bad.join('\n')}`).toEqual([])
  }, 120_000)
})
