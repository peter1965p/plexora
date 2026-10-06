import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installGlobals, code } from '../botprotection/helpers'

const mem = { jobs: new Map<string, any>(), exportCalls: [] as any[], fail: false }
vi.mock('../../server/utils/backup/jobs', async (orig) => ({
  ...(await orig() as any),
  getJob: async (o: string, id: string) => mem.jobs.get(`${o}|${id}`) || null,
  patchJob: async (o: string, id: string, p: any) => { Object.assign(mem.jobs.get(`${o}|${id}`) || {}, p) },
  addEvent: async (o: string, id: string, e: any) => { mem.jobs.get(`${o}|${id}`)?.events.push(e) },
}))
vi.mock('../../server/utils/backup/runtime', () => ({ realDeps: (o: string, id: string) => ({ archiveKey: `jobs/h/${id}.plxbak` }) }))
vi.mock('../../server/utils/backup/export', () => ({
  runExport: async (_d: any, a: any) => { mem.exportCalls.push(a); if (mem.fail) throw new Error('Lesefehler mit Details: sk_test_GEHEIM'); return { sizeBytes: 321, sha256: 'ab', tables: { 'plexora-contacts': { rows: 2, bytes: 10, verified: 2 } }, files: { count: 1, bytes: 5 }, warnings: [] } },
}))
installGlobals()
vi.stubGlobal('useRuntimeConfig', () => ({ newsletterCronSecret: 'cron-secret-xyz', backupBucket: 'b', backupWorkerFunction: 'w' }))
const { default: run } = await import('../../server/api/internal/backup/run.post')

const KEY = 'a'.repeat(64); const SALT = 'b'.repeat(32)
const body = (over: any = {}) => ({ jobId: 'j1', owner: 'chef@firma.de', kind: 'tenant', keyHex: KEY, saltHex: SALT, N: 32768, r: 8, p: 1, ...over })
const ev = (b: any, secret: string | null = 'cron-secret-xyz') => ({ headers: secret === null ? {} : { 'x-internal-cron-secret': secret }, context: {}, body: b, params: {}, query: {} })
beforeEach(() => { mem.jobs.clear(); mem.exportCalls = []; mem.fail = false; mem.jobs.set('chef@firma.de|j1', { owner: 'chef@firma.de', jobId: 'j1', kind: 'tenant', status: 'queued', events: [] }) })

describe('interner Worker-Aufruf', () => {
  it('ohne oder mit falschem Secret 401; es läuft nichts', async () => {
    expect(await code((run as any)(ev(body(), null)))).toBe(401)
    expect(await code((run as any)(ev(body(), 'falsch')))).toBe(401)
    expect(await code((run as any)(ev(body(), 'cron-secret-xyy')))).toBe(401)
    expect(mem.exportCalls).toHaveLength(0)
  })
  it('ungültige Nutzlast 400, unbekannter oder fremder Auftrag 404, schon gestarteter Auftrag 409', async () => {
    for (const bad of [{ keyHex: 'zz' }, { saltHex: '1' }, { kind: 'alles' }, { N: 1e12 }, { r: 'x' }, { owner: 5 }]) expect(await code((run as any)(ev(body(bad))))).toBe(400)
    expect(await code((run as any)(ev(body({ jobId: 'gibtsnicht' }))))).toBe(404)
    expect(await code((run as any)(ev(body({ owner: 'fremd@andere.de' }))))).toBe(404)
    expect(await code((run as any)(ev(body({ kind: 'full' }))))).toBe(404)             // Art passt nicht zum angelegten Auftrag
    mem.jobs.get('chef@firma.de|j1').status = 'running'; expect(await code((run as any)(ev(body())))).toBe(409)
    expect(mem.exportCalls).toHaveLength(0)
  })
  it('Erfolg: Auftrag wird fertig mit Größe, Tabellen und Dateischlüssel; der Export bekommt Schlüssel und Salt als Bytes', async () => {
    expect(await (run as any)(ev(body()))).toEqual({ ok: true })
    const j = mem.jobs.get('chef@firma.de|j1')
    expect(j).toMatchObject({ status: 'done', sizeBytes: 321, fileKey: 'jobs/h/j1.plxbak', files: { count: 1 } })
    expect(j.events.map((e: any) => e.action)).toContain('done')
    expect(mem.exportCalls[0].key.length).toBe(32); expect(mem.exportCalls[0].params.salt.length).toBe(16)
  })
  it('Fehlerfall: Auftrag endet als fehlgeschlagen mit allgemeiner Meldung; Fehlerdetails (auch Geheimnisse) landen nicht im Auftrag', async () => {
    mem.fail = true; const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await (run as any)(ev(body()))).toEqual({ ok: false })
    const j = mem.jobs.get('chef@firma.de|j1')
    expect(j.status).toBe('failed'); expect(JSON.stringify(j)).not.toMatch(/sk_test|GEHEIM|Lesefehler/); expect(j.fileKey).toBeUndefined()
    err.mockRestore()
  })
})
