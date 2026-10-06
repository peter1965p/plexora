import { timingSafeEqual } from 'node:crypto'
import { getJob, patchJob, addEvent } from '../../../utils/backup/jobs'
import { runExport } from '../../../utils/backup/export'
import { realDeps } from '../../../utils/backup/runtime'

// Wird NUR von der Lambda plexora-api per asynchronem Aufruf auf die Lambda plexora-backup-worker gestartet (Secret-Header, kein Cognito-Token).
// Führt den Export aus, legt die verschlüsselte Datei im privaten Backup-Bucket ab und trägt das Ergebnis im Auftrag ein.
export default defineEventHandler(async (event) => {
  const secret = String(getHeader(event, 'x-internal-cron-secret') || ''); const expected = String(useRuntimeConfig().newsletterCronSecret || '')
  const a = Buffer.from(secret); const b = Buffer.from(expected)
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const body = (await readBody(event)) || {}
  const { jobId, owner, kind, keyHex, saltHex, N, r, p } = body
  if (typeof jobId !== 'string' || typeof owner !== 'string' || !['full', 'tenant'].includes(kind) || !/^[0-9a-f]{64}$/.test(keyHex || '') || !/^[0-9a-f]{32}$/.test(saltHex || '')
    || !Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || N > 1 << 20 || r > 32 || p > 16) throw createError({ statusCode: 400, message: 'Ungültiger Auftrag' })
  const job = await getJob(owner, jobId)
  if (!job || job.kind !== kind) throw createError({ statusCode: 404, message: 'Auftrag nicht gefunden' })
  if (job.status !== 'queued') throw createError({ statusCode: 409, message: 'Auftrag wurde schon gestartet' })

  const deps = realDeps(owner, jobId)
  try {
    const res = await runExport(deps, { kind, owner, key: Buffer.from(keyHex, 'hex'), params: { salt: Buffer.from(saltHex, 'hex'), N, r, p } })
    await patchJob(owner, jobId, { status: 'done', step: 'Fertig', sizeBytes: res.sizeBytes, sha256: res.sha256, fileKey: deps.archiveKey, tables: res.tables, files: res.files, warnings: res.warnings, finishedAt: new Date().toISOString() })
    await addEvent(owner, jobId, { at: new Date().toISOString(), action: 'done', by: 'worker' })
    return { ok: true }
  } catch (e) {
    console.error('[backup] Export fehlgeschlagen', (e as Error)?.name, String((e as Error)?.message || '').slice(0, 200))
    await patchJob(owner, jobId, { status: 'failed', step: 'Fehler', error: 'Die Sicherung ist fehlgeschlagen. Bitte erneut versuchen.', finishedAt: new Date().toISOString() })
    await addEvent(owner, jobId, { at: new Date().toISOString(), action: 'failed', by: 'worker' })
    return { ok: false }
  }
})
