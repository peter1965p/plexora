import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

// Der Funnel (Sequenz) muss die Kampagnen-Terminart in den Buchungslink übernehmen, nicht nur die alte Automatisierung.
const calls: any[] = []
let sequences: any[] = []
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const t = cmd.input.TableName
      if (n === 'QueryCommand' && t === 'plexora-sequences') return { Items: sequences }
      if (n === 'QueryCommand') return { Items: [] }
      return {}
    },
  }),
}))
vi.mock('../../server/utils/automations', () => ({
  sendTemplateEmail: async () => {}, setContactLeadStatus: async () => {},
  sendBookingLink: async (...a: any[]) => { calls.push(a) },
}))
class HttpError extends Error { constructor(o: any) { super(o.message) } }
vi.stubGlobal('createError', (o: any) => new HttpError(o))

const { startSequences } = await import('../../server/utils/sequences')

const seq = (nodeTypeId?: string) => ({
  userId: 'owner@firma.de', sequenceId: 's1', enabled: true, trigger: 'form_submitted',
  graph: {
    nodes: [
      { id: 't', type: 'trigger', position: { x: 0, y: 0 }, data: { trigger: 'form_submitted' } },
      { id: 'b', type: 'send_booking_link', position: { x: 0, y: 0 }, data: nodeTypeId ? { appointmentTypeId: nodeTypeId } : {} },
      { id: 'e', type: 'end', position: { x: 0, y: 0 }, data: {} },
    ],
    edges: [{ id: '1', source: 't', target: 'b' }, { id: '2', source: 'b', target: 'e' }],
  },
})

beforeEach(() => { calls.length = 0 })

describe('Funnel-Schritt „Buchungslink“', () => {
  it('nimmt die Kampagnen-Terminart, auch wenn der Schritt eine feste Terminart hat', async () => {
    sequences = [seq('feste-art')]
    await startSequences('owner@firma.de', 'form_submitted', { email: 'a@b.de', formId: 'f1', campaignAppointmentTypeId: 'kampagnen-art' })
    expect(calls.map(c => c[3])).toEqual(['kampagnen-art'])
  })
  it('ohne Kampagne bleibt die feste Terminart des Schritts', async () => {
    sequences = [seq('feste-art')]
    await startSequences('owner@firma.de', 'form_submitted', { email: 'a@b.de', formId: 'f1', campaignAppointmentTypeId: '' })
    expect(calls.map(c => c[3])).toEqual(['feste-art'])
  })
  it('ohne beides: allgemeine Terminseite (undefined)', async () => {
    sequences = [seq()]
    await startSequences('owner@firma.de', 'form_submitted', { email: 'a@b.de', formId: 'f1' })
    expect(calls.map(c => c[3])).toEqual([undefined])
  })
})

describe('Formular-Eingang reicht die Kampagnen-Terminart an beide Funnel-Auslöser weiter', () => {
  const src = readFileSync('server/api/forms/[id]/submit.post.ts', 'utf8')
  it('form_submitted und new_lead', () => {
    expect(src).toMatch(/startSequences\(sequenceOwner, 'form_submitted'[^)]*campaignAppointmentTypeId: campaignTypeId/)
    expect(src).toMatch(/startSequences\(sequenceOwner, 'new_lead'[^)]*campaignAppointmentTypeId: campaignTypeId/)
  })
})
