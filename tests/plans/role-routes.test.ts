import { describe, it, expect } from 'vitest'
import { listRoutes, concretePath } from '../security/routeScan'
import { isPublicRoute } from '../../server/utils/routePolicy'
import { ROLE_RULES, findRoleRule, needForRoute } from '../../server/utils/rolePolicy'
import { ROLE_RANK } from '../../shared/roles'

const routes = listRoutes()
const needOf = (p: string, m = 'GET') => needForRoute(p, m).need

describe('Rollen-Zuordnung der Routen', () => {
  it('jede nicht öffentliche Route hat eine Rollenregel (neue Route ohne Rolle = rot)', () => {
    const missing = routes.filter(r => !isPublicRoute(concretePath(r.path), r.method) && !findRoleRule(concretePath(r.path), r.method)).map(r => r.key)
    expect(missing, `Routen ohne Rollenregel – in server/utils/rolePolicy.ts eintragen:\n${missing.join('\n')}`).toEqual([])
  })
  it('jede Regel trifft mindestens eine Route (keine Altlasten) und hat eine Begründung', () => {
    const unused = ROLE_RULES.filter(rule => !routes.some(r => findRoleRule(concretePath(r.path), r.method) === rule)).map(r => r.prefix || String(r.pattern))
    expect(unused).toEqual([])
    for (const r of ROLE_RULES) { expect(r.note.length, r.prefix || String(r.pattern)).toBeGreaterThan(5); expect(r.role in ROLE_RANK).toBe(true) }
  })
  it('Verteilung entspricht dem Plan (Größenordnung): Mitglied ~53, Admin ~200, Inhaber ~18, Betreiber ~21, jedes Konto ~20', () => {
    const count: Record<string, number> = {}
    for (const r of routes) { if (isPublicRoute(concretePath(r.path), r.method)) continue; const n = needOf(concretePath(r.path), r.method); count[n] = (count[n] || 0) + 1 }
    expect(count.member).toBeGreaterThan(45); expect(count.member).toBeLessThan(65)
    expect(count.admin).toBeGreaterThan(180); expect(count.admin).toBeLessThan(230)
    expect(count.owner).toBeGreaterThan(14); expect(count.owner).toBeLessThan(30)
    expect(count.platform).toBeGreaterThan(15); expect(count.platform).toBeLessThan(30)
  })

  it('Mitglied: CRM, Support, Projekte, Termine-Buchungen, Marketing, Formulare', () => {
    for (const [p, m] of [['/api/contacts', 'GET'], ['/api/contacts/x', 'PATCH'], ['/api/deals', 'POST'], ['/api/support/x/comment', 'POST'], ['/api/projects/x/tasks', 'POST'], ['/api/termine/bookings', 'GET'], ['/api/termine/types/x', 'PUT'], ['/api/marketing/x/send-email', 'POST'], ['/api/forms', 'POST']] as const)
      expect(needOf(p, m), `${m} ${p}`).toBe('member')
  })
  it('Admin: Finanzen, Verträge, HR, Newsletter, Branchenmodule, KI, Einstellungen, Termin-Einstellungen/Google-Kalender, Mail-Protokoll', () => {
    for (const [p, m] of [['/api/finance', 'GET'], ['/api/finance/x/send', 'POST'], ['/api/contracts', 'GET'], ['/api/hr/leave', 'POST'], ['/api/newsletter/campaigns/x/send', 'POST'], ['/api/praxis/patients', 'GET'], ['/api/gastro-orders', 'GET'], ['/api/ai/assistant/execute', 'POST'], ['/api/settings/invoice', 'POST'], ['/api/termine/settings', 'PUT'], ['/api/termine/google-calendars', 'GET'], ['/api/mail-log', 'GET'], ['/api/shop', 'GET']] as const)
      expect(needOf(p, m), `${m} ${p}`).toBe('admin')
  })
  it('Inhaber: Team, Sicherung, Abrechnung, Modul-Kauf, KI- und Zahlungsschlüssel, Einladungsvorlage', () => {
    for (const [p, m] of [['/api/team/invite', 'POST'], ['/api/team/members', 'GET'], ['/api/team/x@y.de', 'DELETE'], ['/api/team/x@y.de', 'PATCH'], ['/api/backup/jobs', 'POST'], ['/api/billing/portal', 'POST'], ['/api/store/checkout', 'POST'], ['/api/settings/ai-providers', 'POST'], ['/api/settings/ai-providers-test', 'POST'], ['/api/settings/mail-templates/invite', 'PUT'], ['/api/settings/branch-packages', 'POST']] as const)
      expect(needOf(p, m), `${m} ${p}`).toBe('owner')
  })
  it('Betreiber: aws, admin, Lizenzverwaltung, Plattform-Einstellungen, Sammel-Mahnlauf', () => {
    for (const [p, m] of [['/api/aws/dynamo', 'GET'], ['/api/aws/s3-delete', 'POST'], ['/api/admin/demo-stats', 'GET'], ['/api/licenses', 'POST'], ['/api/settings/payment', 'POST'], ['/api/settings/dunning', 'GET'], ['/api/finance/batch-dunning', 'POST']] as const)
      expect(needOf(p, m), `${m} ${p}`).toBe('platform')
  })
  it('jedes Konto: Entwürfe, Benachrichtigungen, eigene Lizenz, Konto, Darstellung, Einladung ansehen und annehmen, Bild-Upload, eigene Rolle, Tarif', () => {
    for (const [p, m] of [['/api/drafts/x', 'GET'], ['/api/notifications', 'GET'], ['/api/licenses/my', 'GET'], ['/api/settings/account', 'POST'], ['/api/settings/theme', 'POST'], ['/api/team/accept', 'POST'], ['/api/team/invite-preview', 'POST'], ['/api/aws/s3-upload', 'POST'], ['/api/team/role', 'GET'], ['/api/plan', 'GET'], ['/api/portal/invoices', 'GET']] as const)
      expect(needOf(p, m), `${m} ${p}`).toBe('self')
  })
  it('Branchenpakete und Modulpräfixe gelten an der Segmentgrenze; unbekannte Route verlangt "owner"', () => {
    expect(findRoleRule('/api/financeX')).toBeUndefined(); expect(needForRoute('/api/erfunden/neu')).toEqual({ need: 'owner', rule: false })
  })
})
