import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { planNoticeFrom } from '../../app/utils/planNotice'

const body = (code: string, message = 'Dafür brauchst du das Modul „finance“.') => ({ message, data: { code } })
describe('Hinweise bei Tarif- und Mengenlimits', () => {
  it('402 mit PLAN_REQUIRED/FREE_LIMIT: Hinweis mit Link zum Modul-Store', () => {
    for (const c of ['PLAN_REQUIRED', 'FREE_LIMIT']) expect(planNoticeFrom(402, body(c))).toMatchObject({ kind: 'plan', link: { to: '/store' } })
  })
  it('429/413 mit Limit-Code: Hinweis ohne Link, mit der Meldung des Servers', () => {
    for (const [s, c] of [[429, 'MAIL_LIMIT'], [429, 'UPLOAD_RATE'], [429, 'UPLOAD_DAILY'], [413, 'UPLOAD_TOO_LARGE']] as const) expect(planNoticeFrom(s, body(c, 'Heute …'))).toEqual({ message: 'Heute …', kind: 'limit' })
  })
  it('403 ROLE_REQUIRED: Hinweis der Art "role" mit der Meldung des Servers (kein Link, kein Login-Wechsel)', () => {
    expect(planNoticeFrom(403, body('ROLE_REQUIRED', 'Dafür brauchst du die Rolle Admin.'))).toEqual({ message: 'Dafür brauchst du die Rolle Admin.', kind: 'role' })
    expect(planNoticeFrom(403, body('ANDERES'))).toBeNull(); expect(planNoticeFrom(401, body('ROLE_REQUIRED'))).toBeNull()
  })
  it('alles andere löst keinen Hinweis aus (401, 403 ohne Code, 404, 500, 402 ohne Code, falscher Status zum Code)', () => {
    expect(planNoticeFrom(401, body('PLAN_REQUIRED'))).toBeNull(); expect(planNoticeFrom(403, { message: 'x' })).toBeNull(); expect(planNoticeFrom(500, body('MAIL_LIMIT'))).toBeNull()
    expect(planNoticeFrom(402, { message: 'x' })).toBeNull(); expect(planNoticeFrom(402, body('ANDERES'))).toBeNull(); expect(planNoticeFrom(429, body('PLAN_REQUIRED'))).toBeNull()
    expect(planNoticeFrom(402, undefined)).toBeNull(); expect(planNoticeFrom(402, { data: { code: 'PLAN_REQUIRED' } })).toBeNull()
  })
  it('Plugin und Layouts sind verdrahtet', () => {
    expect(readFileSync('app/plugins/api-auth.client.ts', 'utf8')).toMatch(/planNoticeFrom\(response\?\.status, response\?\._data\)[\s\S]*plx:notice/)
    for (const l of ['app/layouts/dashboard.vue', 'app/layouts/default.vue']) expect(readFileSync(l, 'utf8'), l).toContain('<PlanNotice />')
    expect(readFileSync('app/components/PlanNotice.vue', 'utf8')).toContain("'plx:notice'")
  })
})

describe('Verbrauchsanzeige', () => {
  it('ist in den Einstellungen (Lizenzen) eingebunden und liest nur /api/plan', () => {
    expect(readFileSync('app/pages/settings/index.vue', 'utf8')).toContain('<PlanUsage />')
    const c = readFileSync('app/components/PlanUsage.vue', 'utf8'); expect(c).toContain("'/api/plan'"); expect(c).toContain('data.usage.system'.replace('data.', 'data.value.')) 
  })
})
