import { requireAuth } from '../../../utils/verifyAuth'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { getJob, removeJob } from '../../../utils/backup/jobs'
import { deleteArchive } from '../../../utils/backup/runtime'
import { auditLog, ipOf } from '../../../utils/backup/audit'

// Eigene Sicherung löschen (Datei und Eintrag). Fremde Aufträge: 404.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang sind Sicherungen deaktiviert.')
  const job = await getJob(auth.email, String(getRouterParam(event, 'id') || ''))
  if (!job) throw createError({ statusCode: 404, message: 'Sicherung nicht gefunden' })
  if (job.status === 'running' || job.status === 'queued') throw createError({ statusCode: 409, message: 'Eine laufende Sicherung kann nicht gelöscht werden.' })
  if (job.fileKey) { try { await deleteArchive(job.fileKey) } catch { /* Datei bereits durch die Ablaufregel entfernt */ } }
  await removeJob(auth.email, job.jobId)
  auditLog('delete', { owner: auth.email, jobId: job.jobId, kind: job.kind, ip: ipOf(event) })
  return { success: true }
})
