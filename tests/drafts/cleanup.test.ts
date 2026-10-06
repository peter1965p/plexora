import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

const store = new Map<string, any>()
let failDb = false
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      if (failDb) throw new Error('DB down')
      const name = cmd.constructor.name
      const { Key, Item } = cmd.input
      const k = (o: any) => `${o.owner}|${o.formType}`
      if (name === 'GetCommand') return { Item: store.get(k(Key)) }
      if (name === 'PutCommand') { store.set(k(Item), structuredClone(Item)); return {} }
      if (name === 'DeleteCommand') { store.delete(k(Key)); return {} }
      throw new Error('unerwartet')
    },
  }),
}))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => e }))
class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('createError', (o: any) => new HttpError(o))
vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
vi.stubGlobal('readBody', async (e: any) => e.body)

const { default: putRoute } = await import('../../server/api/drafts/[type].put')
const { deleteOwnDraftQuietly } = await import('../../server/utils/drafts/context')

const T = 'marketing-campaign'
const A = { userId: 'sub-A', email: 'a@firma.de', groups: [] }
const B = { userId: 'sub-B', email: 'b@firma.de', groups: [] }
const ev = (auth: any, body?: any) => ({ context: { auth }, params: { type: T }, body })

beforeEach(() => { store.clear(); failDb = false })

describe('Aufräumen nach dem Anlegen der Kampagne', () => {
  it('löscht nur den eigenen Entwurf', async () => {
    await putRoute(ev(A, { data: { name: 'a' } }) as any)
    await putRoute(ev(B, { data: { name: 'b' } }) as any)
    await deleteOwnDraftQuietly(ev(A), T)
    expect([...store.keys()]).toEqual(['b@firma.de#sub-B|marketing-campaign'])
  })

  it('ohne Anmeldung: kein Fehler, nichts wird gelöscht', async () => {
    await putRoute(ev(A, { data: { name: 'a' } }) as any)
    await expect(deleteOwnDraftQuietly(ev(undefined), T)).resolves.toBeUndefined()
    expect(store.size).toBe(1)
  })

  it('Datenbankfehler blockieren das Anlegen der Kampagne nicht', async () => {
    failDb = true
    await expect(deleteOwnDraftQuietly(ev(A), T)).resolves.toBeUndefined()
  })

  it('POST /api/marketing ruft das Aufräumen erst NACH dem Speichern der Kampagne auf', () => {
    const src = readFileSync('server/api/marketing/index.post.ts', 'utf8')
    expect(src.indexOf("TableName: 'plexora-marketing', Item: campaign")).toBeGreaterThan(-1)
    expect(src.indexOf('deleteOwnDraftQuietly(event')).toBeGreaterThan(src.indexOf("TableName: 'plexora-marketing', Item: campaign"))
  })
})

describe('Entwürfe wirken nicht auf Kampagnen-Daten', () => {
  it('Kampagnen-Liste/Zähler lesen nur plexora-marketing, Entwürfe liegen in plexora-drafts', () => {
    const list = readFileSync('server/api/marketing/index.get.ts', 'utf8')
    expect(list).toContain("'plexora-marketing'")
    expect(list).not.toMatch(/drafts/i)
    const repo = readFileSync('server/utils/drafts/repository.ts', 'utf8')
    expect(repo).toContain("DRAFTS_TABLE = 'plexora-drafts'")
  })
})
