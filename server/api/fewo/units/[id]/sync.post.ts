import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { assertNotDemo } from '../../../../utils/demoPolicy'
import { requireAuth } from '../../../../utils/verifyAuth'
import { enforcePublicRateLimit } from '../../../../utils/rateLimit'
import { fewoContext, loadUnit, syncFeed, unitView, UNITS_TABLE } from '../../../../utils/fewoStore'

// Alle Kanäle dieser Unterkunft jetzt einlesen. Ein fehlerhafter Kanal stoppt die anderen nicht; sein Fehler steht am Kanal.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const { tenantId } = await fewoContext(event)
  await enforcePublicRateLimit(event, 'fewo-sync')
  const unit = await loadUnit(tenantId, String(getRouterParam(event, 'id') || ''))
  const feeds = []
  for (const f of unit.feeds || []) {
    try { const r = await syncFeed(tenantId, unit, f); feeds.push({ ...f, lastSyncAt: new Date().toISOString(), lastStatus: 'ok', lastError: '', count: r.added + r.updated }) }
    catch (e: any) { feeds.push({ ...f, lastSyncAt: new Date().toISOString(), lastStatus: 'error', lastError: String(e?.message || 'Fehler').slice(0, 200) }) }
  }
  const next = { ...unit, feeds, updated: new Date().toISOString() }
  await getDynamoClient().send(new PutCommand({ TableName: UNITS_TABLE, Item: next }))
  return { success: true, unit: unitView(next) }
})
