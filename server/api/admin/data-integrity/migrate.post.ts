import { requireAdmin } from '../../../utils/verifyAuth'
import { migrateLegacyId, USERID_TABLES } from '../../../utils/dataIntegrity'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  const items = Array.isArray(body?.items) ? body.items : []
  if (!items.length) throw createError({ statusCode: 400, message: 'Keine Einträge zum Migrieren übergeben' })

  // Nur bekannte Tabellen/Feld-Kombinationen zulassen — verhindert beliebige Tabellennamen aus dem Request-Body.
  const valid = items.filter((i: any) =>
    typeof i?.table === 'string' && typeof i?.field === 'string' && typeof i?.legacyId === 'string' &&
    USERID_TABLES.some(t => t.table === i.table && t.field === i.field)
  )

  const results = []
  for (const i of valid) {
    results.push(await migrateLegacyId(i.table, i.field, i.legacyId))
  }

  const totalMigrated = results.reduce((sum, r) => sum + r.migrated, 0)
  const totalSkipped  = results.reduce((sum, r) => sum + r.skipped, 0)
  const errors        = results.filter(r => r.error)

  return { results, totalMigrated, totalSkipped, errors }
})
