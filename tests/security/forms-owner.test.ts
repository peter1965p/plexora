import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { db, fakeDynamo, installGlobals, resetDb, code } from '../botprotection/helpers'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDynamo() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => e }))
vi.mock('../../server/utils/automations', () => ({ fireAutomations: () => {} }))
vi.mock('../../server/utils/sequences', () => ({ startSequences: async () => {} }))
vi.mock('../../server/utils/campaignAppointments', () => ({ findCampaignAppointmentTypeId: async () => '' }))
installGlobals()
const { default: submit } = await import('../../server/api/forms/[id]/submit.post')
const ev = (id: string) => ({ headers: { 'x-forwarded-for': '198.51.100.20' }, params: { id }, query: {}, body: { data: { Email: 'a@b.de' } } })
beforeEach(() => resetDb())

describe('Lead-Formular ohne Besitzer', () => {
  it('Formular ohne userId (oder leer) nimmt nichts an: 404, nichts gespeichert, kein Rückfall auf demo-user', async () => {
    db.forms = [{ formId: 'f0', title: 'Waise' }, { formId: 'f1', title: 'Leer', userId: '' }]
    expect(await code(submit(ev('f0') as any))).toBe(404)
    expect(await code(submit(ev('f1') as any))).toBe(404)
    expect(db.writes).toHaveLength(0)
  })
  it('Formular mit Besitzer funktioniert weiter und legt den Kontakt unter dem Besitzer an', async () => {
    db.forms = [{ formId: 'f2', title: 'Ok', userId: 'chef@firma.de' }]
    expect(await code(submit(ev('f2') as any))).toBe(200)
    expect(db.writes).toContain('plexora-contacts:PutCommand')
  })
  it("im Server steht kein Rückfall auf 'demo-user' mehr (außer der erlaubten Behandlung in tenant/notifications/queryByUser)", () => {
    for (const f of ['server/api/forms/[id]/submit.post.ts', 'server/api/webhooks/stripe.post.ts']) expect(readFileSync(f, 'utf8'), f).not.toContain("'demo-user'")
  })
})
