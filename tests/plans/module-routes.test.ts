import { describe, it, expect } from 'vitest'
import { listRoutes, concretePath } from '../security/routeScan'
import { isPublicRoute } from '../../server/utils/routePolicy'
import { MODULE_RULES, findModuleRule, describeNeed } from '../../server/utils/moduleAccess'
import { TIER_FALLBACK_MODULES } from '../../shared/plans'

const routes = listRoutes()
const ALL = new Set(Object.values(TIER_FALLBACK_MODULES).flat())
const needOf = (p: string, m = 'GET') => { const r = findModuleRule(p, m); return r ? describeNeed(r.need) : undefined }

describe('Modul-Zuordnung der Routen', () => {
  it('jede nicht öffentliche Route hat eine Regel (neue Route ohne Modul = rot)', () => {
    const missing = routes.filter(r => !isPublicRoute(concretePath(r.path), r.method) && !findModuleRule(concretePath(r.path), r.method)).map(r => r.key)
    expect(missing, `Routen ohne Modulregel – in server/utils/moduleAccess.ts eintragen:\n${missing.join('\n')}`).toEqual([])
  })
  it('jede Regel trifft mindestens eine Route (keine Altlasten)', () => {
    const unused = MODULE_RULES.filter(rule => !routes.some(r => findModuleRule(concretePath(r.path), r.method) === rule)).map(r => r.prefix || String(r.pattern))
    expect(unused).toEqual([])
  })
  it('Lizenzmodule in den Regeln sind echte Module der Tarife', () => {
    for (const r of MODULE_RULES) {
      if (typeof r.need === 'string' || 'branch' in r.need) continue
      for (const m of Array.isArray(r.need.module) ? r.need.module : [r.need.module]) expect(ALL.has(m), `${r.prefix}: ${m}`).toBe(true)
    }
  })
  it('jede Regel hat eine Begründung', () => { for (const r of MODULE_RULES) expect(r.note.length, r.prefix || String(r.pattern)).toBeGreaterThan(5) })
  it('Plausibilität: die meisten Routen sind zugeordnet', () => {
    const mapped = routes.filter(r => findModuleRule(concretePath(r.path), r.method)).length
    expect(mapped).toBeGreaterThan(250)
  })

  it('wichtige Zuordnungen', () => {
    expect(needOf('/api/finance')).toBe('finance')
    expect(needOf('/api/finance/cashbook')).toBe('finance')
    expect(needOf('/api/hr/leave')).toBe('hr')
    expect(needOf('/api/newsletter/campaigns')).toBe('newsletter')
    expect(needOf('/api/contacts')).toBe('crm')
    expect(needOf('/api/praxis/patients')).toBe('branch:praxis')
    expect(needOf('/api/gastro-orders')).toBe('branch:gastro')
    expect(needOf('/api/gastro-tables/x')).toBe('branch:gastro')
    expect(needOf('/api/termine/types')).toBe('marketing|nexora')
    expect(needOf('/api/ai/assistant/execute', 'POST')).toBe('paid')
  })
  it('Grundfunktionen gehen ohne Lizenz: Einladung annehmen, Kauf, Sicherung, Konto', () => {
    for (const [p, m] of [['/api/team/accept', 'POST'], ['/api/team/invite-preview', 'POST'], ['/api/team/members', 'GET'], ['/api/store/checkout', 'POST'], ['/api/billing/portal', 'POST'], ['/api/backup/export', 'POST'], ['/api/settings/account', 'GET'], ['/api/licenses/my', 'GET'], ['/api/notifications', 'GET'], ['/api/drafts/marketing-campaign', 'GET']] as const)
      expect(needOf(p, m), `${m} ${p}`).toBe('none')
  })
  it('Team-Einladung verschicken und Einladungsvorlage brauchen eine Lizenz', () => {
    expect(needOf('/api/team/invite', 'POST')).toBe('paid')
    expect(needOf('/api/settings/mail-templates/invite', 'PUT')).toBe('paid')
  })
  it('Präfix gilt an der Segmentgrenze (/api/hrx ist nicht /api/hr)', () => {
    expect(findModuleRule('/api/hrx')).toBeUndefined()
    expect(findModuleRule('/api/financeX/y')).toBeUndefined()
  })
})
