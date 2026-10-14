import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const P = new Map<string, any>()
const key = (k: any) => `${k.userId}|${k.projectId}`
const db = { async send(cmd: any) {
  const c = cmd.constructor.name, i = cmd.input
  if (c === 'GetCommand') { const r = P.get(key(i.Key)); return { Item: r ? structuredClone(r) : undefined } }
  if (c === 'UpdateCommand') {
    const k = key(i.Key), row = P.get(k); const v = i.ExpressionAttributeValues
    if (!row) { const e: any = new Error('c'); e.name = 'ConditionalCheckFailedException'; throw e }
    if (i.ConditionExpression?.includes('scheduleRev = :rev')) { const cur = row.scheduleRev; if (!(cur === v[':rev'] || (cur === undefined && v[':rev'] === 0))) { const e: any = new Error('c'); e.name = 'ConditionalCheckFailedException'; throw e } row.tasks = v[':tasks']; row.scheduleRev = v[':next']; return {} }
    row.tasks = v[':t']; row.scheduleRev = (row.scheduleRev ?? 0) + 1; return {}
  }
  return {}
} }
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => db }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => (e === 'sylvia@firma.de' ? 'chef@firma.de' : e) }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('readBody', async (e: any) => e.body)
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
const H: Record<string, any> = {}
beforeAll(async () => { H.put = (await import('../../server/api/projects/[id]/schedule.put')).default; H.del = (await import('../../server/api/projects/[id]/tasks/[taskId].delete')).default })
const PID = '11111111-1111-4111-8111-111111111111'
const OWNER = { userId: 'u1', email: 'chef@firma.de', groups: ['customers'] }, OTHER = { userId: 'u2', email: 'fremd@firma.de', groups: ['customers'] }, DEMO = { userId: 'd', email: 'demo@plexora.eu', groups: ['customers'] }, MEMBER = { userId: 'u3', email: 'sylvia@firma.de', groups: ['customers'] }
const ev = (auth: any, body?: any, params: any = {}) => ({ context: { auth }, params: { id: PID, ...params }, body })
const call = async (fn: any, e: any) => { try { return { code: 200, res: await fn(e) } } catch (x: any) { return { code: x.statusCode as number, msg: x.message } } }
beforeEach(() => { P.clear(); P.set(`chef@firma.de|${PID}`, { userId: 'chef@firma.de', projectId: PID, name: 'Alpha', status: 'active', tasks: [
  { taskId: 'a', title: 'A', startDate: '2026-11-01', endDate: '2026-11-03', status: 'todo', assignee: 'Anna', secret: 'x' },
  { taskId: 'b', title: 'B', startDate: '2026-11-04', endDate: '2026-11-06', status: 'todo', predecessors: ['a'] },
  { taskId: 'c', title: 'C', startDate: '', endDate: '', status: 'todo' }] }) })
const tasksOf = () => P.get(`chef@firma.de|${PID}`).tasks

describe('Projektplan speichern', () => {
  it('nur Plan-Felder; Nachfolger rückt nach; andere Felder des Vorgangs bleiben', async () => {
    const r = await call(H.put, ev(OWNER, { changes: [{ taskId: 'a', startDate: '2026-11-03', endDate: '2026-11-05', title: 'HACK', status: 'done', userId: 'x' }] }))
    expect(r.code).toBe(200)
    const [a, b] = tasksOf()
    expect([a.startDate, a.endDate, a.title, a.status, a.secret]).toEqual(['2026-11-03', '2026-11-05', 'A', 'todo', 'x'])
    expect([b.startDate, b.endDate]).toEqual(['2026-11-06', '2026-11-08'])
    expect(r.res.rev).toBe(1)
  })
  it('Vorgang ohne Termin bekommt einen gültigen Standardtermin, nichts wird zerstört', async () => {
    expect((await call(H.put, ev(OWNER, { changes: [{ taskId: 'a', progress: 10 }] }))).code).toBe(200)
    expect(tasksOf()[2].startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('Mandanten getrennt (404), Mitglied arbeitet im Konto des Inhabers, Demo gesperrt, anonym 401', async () => {
    expect((await call(H.put, ev(OTHER, { changes: [{ taskId: 'a', progress: 1 }] }))).code).toBe(404)
    expect((await call(H.put, ev(MEMBER, { changes: [{ taskId: 'a', progress: 50 }] }))).code).toBe(200)
    expect((await call(H.put, ev(DEMO, { changes: [{ taskId: 'a', progress: 1 }] }))).code).toBe(403)
    expect((await call(H.put, ev(undefined, { changes: [{ taskId: 'a', progress: 1 }] }))).code).toBe(401)
    expect((await call(H.put, ev(OWNER, { changes: [{ taskId: 'a', progress: 1 }] }, { id: '../x' }))).code).toBe(404)
  })
  it('Kreis, Selbstbezug, schlechte Daten: 422 und nichts gespeichert', async () => {
    const before = JSON.stringify(tasksOf())
    for (const c of [{ taskId: 'a', predecessors: ['b'] }, { taskId: 'a', predecessors: ['a'] }, { taskId: 'a', endDate: '2020-01-01' }, { taskId: 'zzz', progress: 1 }, { taskId: 'a', startDate: 'morgen' }]) expect((await call(H.put, ev(OWNER, { changes: [c] }))).code, JSON.stringify(c)).toBe(422)
    expect(JSON.stringify(tasksOf())).toBe(before)
    expect((await call(H.put, ev(OWNER, { changes: [] }))).code).toBe(400)
    expect((await call(H.put, ev(OWNER, { changes: Array.from({ length: 300 }, () => ({ taskId: 'a' })) }))).code).toBe(400)
  })
  it('gleichzeitige Änderung: veraltete rev ergibt 409, aktuelle klappt', async () => {
    expect((await call(H.put, ev(OWNER, { rev: 0, changes: [{ taskId: 'a', progress: 10 }] }))).code).toBe(200)
    expect((await call(H.put, ev(OWNER, { rev: 0, changes: [{ taskId: 'a', progress: 20 }] }))).code).toBe(409)
    expect((await call(H.put, ev(OWNER, { rev: 1, changes: [{ taskId: 'a', progress: 20 }] }))).code).toBe(200)
    expect(tasksOf()[0].progress).toBe(20)
  })
})

describe('Vorgang löschen', () => {
  it('entfernt den Vorgang und seine Verweise bei anderen; fremde/unbekannte: 404; Demo: 403', async () => {
    expect((await call(H.del, ev(OTHER, undefined, { taskId: 'a' }))).code).toBe(404)
    expect((await call(H.del, ev(DEMO, undefined, { taskId: 'a' }))).code).toBe(403)
    expect((await call(H.del, ev(OWNER, undefined, { taskId: 'zzz' }))).code).toBe(404)
    expect((await call(H.del, ev(OWNER, undefined, { taskId: 'a' }))).code).toBe(200)
    expect(tasksOf().map((t: any) => t.taskId)).toEqual(['b', 'c'])
    expect(tasksOf()[0].predecessors).toEqual([])
  })
})
