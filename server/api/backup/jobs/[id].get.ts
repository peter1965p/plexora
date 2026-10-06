import { requireAuth } from '../../../utils/verifyAuth'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { getJob, publicJob } from '../../../utils/backup/jobs'

// Status eines eigenen Auftrags. Ein fremder oder unbekannter Auftrag antwortet immer gleich mit 404.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang sind Sicherungen deaktiviert.')
  const job = await getJob(auth.email, String(getRouterParam(event, 'id') || ''))
  if (!job) throw createError({ statusCode: 404, message: 'Sicherung nicht gefunden' })
  return { job: publicJob(job) }
})
