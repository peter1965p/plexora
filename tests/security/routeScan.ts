import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { isPublicRoute } from '../../server/utils/routePolicy'

// Hilfsfunktionen, die eine Anmeldung erzwingen (401 ohne Token). Neue Helfer hier eintragen.
// getUserId (server/utils/queryByUser.ts) und assertOwner (server/utils/ownership.ts) verlangen seit Block d selbst eine Anmeldung;
// tests/security/strict-helpers.test.ts beweist das.
export const AUTH_HELPERS = ['requireAuth', 'requireAdmin', 'requireTenantId', 'requireMailSender', 'requireOwner', 'draftContext', 'verifyBearerToken', 'verifyToken', 'getUserId', 'assertOwner']
const AUTH_RE = new RegExp(`\\b(${AUTH_HELPERS.join('|')})\\s*\\(|statusCode:\\s*401`)

export interface RouteInfo { key: string; method: string; path: string; file: string; auth: boolean }

export function listRoutes(apiDir = 'server/api'): RouteInfo[] {
  const out: RouteInfo[] = []
  const walk = (dir: string) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) { walk(full); continue }
      if (!name.endsWith('.ts')) continue
      let rel = relative(apiDir, full).replace(/\\/g, '/')
      const m = rel.match(/^(.*?)\.(get|post|put|patch|delete)\.ts$/)
      const method = m ? m[2].toUpperCase() : 'ANY'
      let path = m ? m[1] : rel.replace(/\.ts$/, '')
      path = path.replace(/\/index$/, '').replace(/^index$/, '')
      const urlPath = '/api/' + path
      out.push({ key: `${method} ${urlPath}`, method, path: urlPath, file: full, auth: AUTH_RE.test(readFileSync(full, 'utf8')) })
    }
  }
  walk(apiDir)
  return out
}

export type Decision = 'auth' | 'public' | 'legacy' | 'undecided'

// Dynamische Segmente [id] werden für die Allowlist durch "x" ersetzt
export const concretePath = (p: string) => p.replace(/\[[^\]]+\]/g, 'x')

export function classify(routes: RouteInfo[], legacy: ReadonlySet<string>) {
  const res = { undecided: [] as string[], staleLegacy: [] as string[], counts: { auth: 0, public: 0, legacy: 0 } }
  for (const r of routes) {
    const isLegacy = legacy.has(r.key)
    const pub = isPublicRoute(concretePath(r.path), r.method)
    if (r.auth) { res.counts.auth++; if (isLegacy) res.staleLegacy.push(`${r.key} (hat jetzt eine Anmeldung)`); continue }
    if (pub) { res.counts.public++; if (isLegacy) res.staleLegacy.push(`${r.key} (steht jetzt in der Allowlist)`); continue }
    if (isLegacy) { res.counts.legacy++; continue }
    res.undecided.push(r.key)
  }
  const known = new Set(routes.map(r => r.key))
  for (const k of legacy) if (!known.has(k)) res.staleLegacy.push(`${k} (Route existiert nicht mehr)`)
  return res
}
