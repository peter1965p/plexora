import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installGlobals, authEv, code } from '../botprotection/helpers'

// ── In-Memory-Ersatz für Aufträge, Worker-Aufruf, Datei-Ablage, Mails, Drossel ──
const mem = { jobs: new Map<string, any>(), invoked: [] as any[], deleted: [] as string[], presigned: [] as any[], mails: [] as any[], counts: new Map<string, number>(), failInvoke: false, bucket: 'plexora-backups-test', worker: 'plexora-backup-worker' }
const k = (o: string, id: string) => `${o}|${id}`
vi.mock('../../server/utils/backup/jobs', async (orig) => {
  const real: any = await orig()
  let n = 0
  return {
    ...real,
    createJob: async (owner: string, kind: string, by: string, ip: string) => { const j = { owner, jobId: `job-${++n}-${'x'.repeat(8)}`, kind, status: 'queued', createdAt: new Date().toISOString(), expiresAt: Math.floor(Date.now() / 1000) + 3600, events: [{ at: 'now', action: 'start', by, ip }] }; mem.jobs.set(k(owner, j.jobId), j); return j },
    getJob: async (owner: string, id: string) => mem.jobs.get(k(owner, id)) || null,
    listJobs: async (owner: string) => [...mem.jobs.values()].filter(j => j.owner === owner),
    patchJob: async (owner: string, id: string, p: any) => { Object.assign(mem.jobs.get(k(owner, id)) || {}, p) },
    addEvent: async (owner: string, id: string, e: any) => { mem.jobs.get(k(owner, id))?.events.push(e) },
    removeJob: async (owner: string, id: string) => { mem.jobs.delete(k(owner, id)) },
    runningJob: async (owner: string) => [...mem.jobs.values()].find(j => j.owner === owner && (j.status === 'queued' || j.status === 'running')) || null,
  }
})
vi.mock('../../server/utils/backup/runtime', () => ({
  backupBucket: () => mem.bucket, workerFunction: () => mem.worker,
  invokeWorker: async (b: any) => { if (mem.failInvoke) throw new Error('boom'); mem.invoked.push(b) },
  presignDownload: async (key: string, name: string, s: number) => { mem.presigned.push({ key, name, s }); return `https://signed.example/${key}?exp=${s}` },
  deleteArchive: async (key: string) => { mem.deleted.push(key) },
  realDeps: () => ({}), archiveKey: (o: string, id: string) => `jobs/h/${id}.plxbak`,
}))
vi.mock('../../server/utils/mailer', () => ({ sendMail: async (m: any) => { mem.mails.push(m); return 'sent' } }))
vi.mock('../../server/utils/rateLimit', async (orig) => ({ ...(await orig() as any), checkRateLimit: async (b: string, id: string, max: number) => { const c = (mem.counts.get(b + id) || 0) + 1; mem.counts.set(b + id, c); return c <= max } }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => ({ 'maria@firma.de': 'chef@firma.de' } as Record<string, string>)[e] || e }))
installGlobals()

const P = 'Correct-Horse-Battery-Staple-42'
const mods = import.meta.glob('../../server/api/backup/jobs/**/*.ts')
const load = async (rel: string): Promise<any> => ((await mods[`../../server/api/backup/jobs/${rel}.ts`]()) as any).default
const adm = ['admins']
beforeEach(() => { mem.jobs.clear(); mem.invoked = []; mem.deleted = []; mem.presigned = []; mem.mails = []; mem.counts.clear(); mem.failInvoke = false; mem.bucket = 'plexora-backups-test'; mem.worker = 'plexora-backup-worker' })
const start = async (email: string, body: any, groups?: string[]) => (await load('index.post'))(authEv(email, { body }, groups))

describe('Sicherung starten: Rechte', () => {
  it('ohne Token 401, Demo-Konto 403 (auch mit Gruppe demo), nichts startet', async () => {
    const h = await load('index.post')
    expect(await code(h({ headers: {}, context: {}, body: { kind: 'tenant', passphrase: P, passphraseConfirm: P } }))).toBe(401)
    expect(await code(start('demo@plexora.eu', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(403)
    expect(await code(start('x@y.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }, ['demo']))).toBe(403)
    expect(mem.invoked).toHaveLength(0); expect(mem.jobs.size).toBe(0)
  })
  it('Gesamtsicherung: Nicht-Admin 403, Admin ok', async () => {
    expect(await code(start('chef@firma.de', { kind: 'full', passphrase: P, passphraseConfirm: P }))).toBe(403)
    expect(mem.invoked).toHaveLength(0)
    expect(await code(start('admin@plexora.eu', { kind: 'full', passphrase: P, passphraseConfirm: P }, adm))).toBe(200)
    expect(mem.invoked[0]).toMatchObject({ kind: 'full', owner: 'admin@plexora.eu' })
  })
  it('Export der eigenen Daten: Inhaber ok, Team-Mitglied 403; Admin darf den eigenen Export ebenfalls, aber nie den eines anderen', async () => {
    expect(await code(start('maria@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(403)
    expect(await code(start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(200)
    expect(mem.invoked[0]).toMatchObject({ kind: 'tenant', owner: 'chef@firma.de' })
    // Besitzer kommt nur aus dem Token, nie aus dem Request
    mem.jobs.clear(); mem.invoked = []
    await start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P, owner: 'fremd@andere.de', userId: 'fremd@andere.de' })
    expect(mem.invoked[0].owner).toBe('chef@firma.de')
  })
  it('ungültige Art: 400; Bucket/Worker nicht eingerichtet: 503', async () => {
    expect(await code(start('chef@firma.de', { kind: 'alles', passphrase: P, passphraseConfirm: P }))).toBe(400)
    mem.worker = ''; expect(await code(start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(503)
  })
})

describe('Sicherung starten: Passphrase, Limits, Audit', () => {
  it('Passphrase: mindestens 12 Zeichen, beide Eingaben gleich', async () => {
    for (const b of [{ passphrase: 'kurz', passphraseConfirm: 'kurz' }, { passphrase: P, passphraseConfirm: 'anders-anders' }, { passphrase: P }, {}]) expect(await code(start('chef@firma.de', { kind: 'tenant', ...b }))).toBe(400)
    expect(mem.invoked).toHaveLength(0)
  })
  it('der Worker bekommt nur den abgeleiteten Schlüssel, nie die Passphrase; Antworten, Aufträge, Protokoll und Mails enthalten sie nicht', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {}); const err = vi.spyOn(console, 'error').mockImplementation(() => {}); const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const res: any = await start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P })
    expect(mem.invoked[0]).toMatchObject({ keyHex: expect.stringMatching(/^[0-9a-f]{64}$/), saltHex: expect.stringMatching(/^[0-9a-f]{32}$/) })
    const everything = JSON.stringify([res, mem.invoked.map(i => ({ ...i, keyHex: '', saltHex: '' })), [...mem.jobs.values()], mem.mails, log.mock.calls, err.mock.calls, warn.mock.calls])
    expect(everything).not.toContain(P); expect(JSON.stringify(res)).not.toMatch(/keyHex|saltHex|passphrase/)
    log.mockRestore(); err.mockRestore(); warn.mockRestore()
  })
  it('Höchstens 3 Aufträge pro Stunde und Konto (4. = 429); nur ein laufender Auftrag gleichzeitig (409)', async () => {
    expect(await code(start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(200)
    expect(await code(start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(409)    // erster läuft noch
    for (const j of mem.jobs.values()) j.status = 'done'
    expect(await code(start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(200)
    for (const j of mem.jobs.values()) j.status = 'done'
    expect(await code(start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(200)
    for (const j of mem.jobs.values()) j.status = 'done'
    expect(await code(start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(429)
    expect(await code(start('anderer@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(200)     // andere Konten sind unabhängig
  })
  it('Start löst Protokollzeile und Mail an den Inhaber aus; schlägt der Worker-Aufruf fehl, endet der Auftrag als fehlgeschlagen', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P })
    expect(log.mock.calls.flat().join(' ')).toMatch(/\[audit\] backup start owner=chef@firma.de/); log.mockRestore()
    expect(mem.mails).toHaveLength(1); expect(mem.mails[0]).toMatchObject({ userId: 'chef@firma.de', to: 'chef@firma.de', kind: 'internal' })
    mem.jobs.clear(); mem.counts.clear(); mem.failInvoke = true
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await code(start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }))).toBe(502); err.mockRestore()
    expect([...mem.jobs.values()][0].status).toBe('failed')
  })
})

describe('Status, Liste, Download, Löschen: nur der eigene Auftrag (IDOR)', () => {
  const seed = async () => { await start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }); const j = [...mem.jobs.values()][0]; Object.assign(j, { status: 'done', fileKey: 'jobs/h/geheim.plxbak', sizeBytes: 123 }); return j }
  it('Eigentümer sieht Status, Liste und bekommt einen Link mit 10 Minuten Gültigkeit, Audit + Mail inklusive; Dateischlüssel erscheint nie in Antworten', async () => {
    const j = await seed(); mem.mails = []
    const st: any = await (await load('[id].get'))(authEv('chef@firma.de', { params: { id: j.jobId } }))
    expect(st.job).toMatchObject({ status: 'done', sizeBytes: 123, downloadable: true })
    const list: any = await (await load('index.get'))(authEv('chef@firma.de'))
    expect(list.jobs).toHaveLength(1); expect(JSON.stringify([st, list])).not.toContain('geheim.plxbak')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    const dl: any = await (await load('[id]/download.post'))(authEv('chef@firma.de', { params: { id: j.jobId } }))
    expect(dl.expiresInSeconds).toBe(600); expect(mem.presigned[0]).toMatchObject({ key: 'jobs/h/geheim.plxbak', s: 600 }); expect(mem.presigned[0].name).toMatch(/\.plxbak$/)
    expect(j.events.some((e: any) => e.action === 'download')).toBe(true); expect(log.mock.calls.flat().join(' ')).toMatch(/backup download/); log.mockRestore()
    expect(mem.mails).toHaveLength(1)
  })
  it('IDOR: ein anderer Nutzer (auch Admin, Team-Mitglied, Demo) kann Status, Link und Löschen eines fremden Auftrags nie nutzen – immer 404 bzw. 403', async () => {
    const j = await seed(); mem.presigned = []
    for (const who of [['fremd@andere.de'], ['admin@plexora.eu', adm], ['maria@firma.de']] as const) {
      const ev = (extra: any = {}) => authEv(who[0], { params: { id: j.jobId }, ...extra }, who[1] as any)
      expect(await code((await load('[id].get'))(ev())), who[0]).toBe(404)
      expect(await code((await load('[id]/download.post'))(ev())), who[0]).toBe(404)
      expect(await code((await load('[id].delete'))(ev())), who[0]).toBe(404)
      const l: any = await (await load('index.get'))(authEv(who[0], {}, who[1] as any)); expect(l.jobs).toEqual([])
    }
    expect(await code((await load('[id]/download.post'))(authEv('demo@plexora.eu', { params: { id: j.jobId } })))).toBe(403)
    expect(mem.presigned).toHaveLength(0); expect(mem.deleted).toHaveLength(0); expect(mem.jobs.size).toBe(1)
    expect(await code((await load('[id].get'))({ headers: {}, context: {}, params: { id: j.jobId } }))).toBe(401)
  })
  it('Download erst, wenn der Auftrag fertig ist (409); laufender Auftrag nicht löschbar; Löschen entfernt Datei und Eintrag', async () => {
    await start('chef@firma.de', { kind: 'tenant', passphrase: P, passphraseConfirm: P }); const j = [...mem.jobs.values()][0]
    expect(await code((await load('[id]/download.post'))(authEv('chef@firma.de', { params: { id: j.jobId } })))).toBe(409)
    expect(await code((await load('[id].delete'))(authEv('chef@firma.de', { params: { id: j.jobId } })))).toBe(409)
    Object.assign(j, { status: 'done', fileKey: 'jobs/h/x.plxbak' })
    expect(await code((await load('[id].delete'))(authEv('chef@firma.de', { params: { id: j.jobId } })))).toBe(200)
    expect(mem.deleted).toEqual(['jobs/h/x.plxbak']); expect(mem.jobs.size).toBe(0)
  })
})
