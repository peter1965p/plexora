import { requireAdmin } from '../../../utils/verifyAuth'
import { section, lambdaSection, dbSection, protectionSection, demoSection, backupSection, runtimeSection } from '../../../utils/pscOverview'

// PSC Manager: Überblick über Plattform, Datenbank, Schutz, Demo-Pool und Sicherung. Nur Plattform-Betreiber (kein Demo-Zugriff, es zeigt die echte Infrastruktur).
export default defineEventHandler(async (event) => {
  const auth = requireAdmin(event)
  const force = String(getQuery(event).refresh || '') === '1'
  const [lambda, db, demo, backups] = await Promise.all([section(lambdaSection), section(() => dbSection(force)), section(demoSection), section(() => backupSection(auth.email))])
  return { generatedAt: new Date().toISOString(), lambda, db, demo, backups, protection: await section(async () => protectionSection()), runtime: await section(async () => runtimeSection()) }
})
