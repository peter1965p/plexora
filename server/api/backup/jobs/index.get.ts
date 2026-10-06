import { requireAuth } from '../../../utils/verifyAuth'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { listJobs, publicJob } from '../../../utils/backup/jobs'

// Eigene Sicherungen der letzten 7 Tage (Zeit, Art, Größe, Status). Fremde Aufträge sind nie sichtbar.
export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  assertNotDemo(auth, 'Im Demo-Zugang sind Sicherungen deaktiviert.')
  return { jobs: (await listJobs(auth.email)).map(publicJob) }
})
