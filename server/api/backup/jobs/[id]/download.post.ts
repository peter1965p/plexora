import { requireAuth } from '../../../../utils/verifyAuth'
import { assertNotDemo } from '../../../../utils/demoPolicy'
import { getJob, addEvent } from '../../../../utils/backup/jobs'
import { presignDownload } from '../../../../utils/backup/runtime'
import { auditLog, notifyOwner, ipOf } from '../../../../utils/backup/audit'

// Kurzlebiger Download-Link (10 Minuten) für die verschlüsselte Datei. Der Link gehört zum Auftrag des Anfragenden: ein anderer Nutzer bekommt 404.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang sind Sicherungen deaktiviert.')
  const job = await getJob(auth.email, String(getRouterParam(event, 'id') || ''))
  if (!job) throw createError({ statusCode: 404, message: 'Sicherung nicht gefunden' })
  if (job.status !== 'done' || !job.fileKey) throw createError({ statusCode: 409, message: 'Die Sicherung ist noch nicht fertig.' })
  const ip = ipOf(event)
  const url = await presignDownload(job.fileKey, `plexora-sicherung-${job.kind === 'full' ? 'gesamt' : 'meine-daten'}-${job.createdAt.slice(0, 10)}.plxbak`, 600)
  await addEvent(auth.email, job.jobId, { at: new Date().toISOString(), action: 'download', by: auth.email, ip })
  auditLog('download', { owner: auth.email, jobId: job.jobId, kind: job.kind, ip })
  await notifyOwner(auth.email, 'download', job.jobId, job.kind, ip)
  return { url, expiresInSeconds: 600 }
})
