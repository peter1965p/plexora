import { requireAuth } from '../../../utils/verifyAuth'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { resolveUserId } from '../../../utils/tenant'
import { checkRateLimit } from '../../../utils/rateLimit'
import { deriveBackupKey, validatePassphrase } from '../../../utils/backup/crypto'
import { createJob, runningJob, patchJob, addEvent, publicJob } from '../../../utils/backup/jobs'
import { MAX_STARTS_PER_HOUR } from '../../../utils/backup/config'
import { backupBucket, workerFunction, invokeWorker } from '../../../utils/backup/runtime'
import { auditLog, notifyOwner, ipOf } from '../../../utils/backup/audit'

// Sicherung starten. kind "full": nur Plattform-Admins (Gruppe admins). kind "tenant": nur der Inhaber des Kontos (kein Team-Mitglied).
// Das Demo-Konto bekommt 403. Die Passphrase wird nur hier zum Ableiten des Schlüssels benutzt und weder gespeichert noch protokolliert noch zurückgegeben.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang sind Sicherungen deaktiviert.')
  const owner = (auth.email || '').trim()
  if (!owner) throw createError({ statusCode: 401, message: 'Anmeldung erforderlich' })
  const body = (await readBody(event)) || {}
  const kind = body.kind
  if (kind !== 'full' && kind !== 'tenant') throw createError({ statusCode: 400, message: 'Ungültige Art der Sicherung' })
  if (kind === 'full' && !(auth.groups || []).includes('admins')) throw createError({ statusCode: 403, message: 'Die Gesamtsicherung ist nur für Plattform-Administratoren.' })
  if (kind === 'tenant' && (await resolveUserId(owner)).toLowerCase() !== owner.toLowerCase()) throw createError({ statusCode: 403, message: 'Den Export der Daten kann nur der Inhaber des Kontos starten.' })
  const passError = validatePassphrase(body.passphrase, body.passphraseConfirm)
  if (passError) throw createError({ statusCode: 400, message: passError })
  if (!backupBucket() || !workerFunction()) throw createError({ statusCode: 503, message: 'Die Sicherung ist noch nicht eingerichtet (scripts/aws/setup-backup.sh).' })
  if (!(await checkRateLimit('backup-start', owner.toLowerCase(), MAX_STARTS_PER_HOUR, 3600))) throw createError({ statusCode: 429, message: `Höchstens ${MAX_STARTS_PER_HOUR} Sicherungen pro Stunde. Bitte später erneut versuchen.` })
  if (await runningJob(owner)) throw createError({ statusCode: 409, message: 'Es läuft bereits eine Sicherung. Bitte warten, bis sie fertig ist.' })

  const ip = ipOf(event)
  const job = await createJob(owner, kind, owner, ip)
  const { key, params } = deriveBackupKey(body.passphrase)
  try {
    await invokeWorker({ jobId: job.jobId, owner, kind, keyHex: key.toString('hex'), saltHex: params.salt.toString('hex'), N: params.N, r: params.r, p: params.p })
  } catch (e) {
    await patchJob(owner, job.jobId, { status: 'failed', error: 'Der Auftrag konnte nicht gestartet werden', finishedAt: new Date().toISOString() })
    await addEvent(owner, job.jobId, { at: new Date().toISOString(), action: 'failed', by: owner, ip })
    console.error('[backup] Worker-Aufruf fehlgeschlagen', (e as Error)?.name)
    throw createError({ statusCode: 502, message: 'Der Sicherungsauftrag konnte nicht gestartet werden.' })
  }
  auditLog('start', { owner, jobId: job.jobId, kind, ip })
  await notifyOwner(owner, 'start', job.jobId, kind, ip)
  return { job: publicJob(job) }
})
