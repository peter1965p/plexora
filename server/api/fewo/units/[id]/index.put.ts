import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { assertNotDemo } from '../../../../utils/demoPolicy'
import { requireAuth } from '../../../../utils/verifyAuth'
import { fewoContext, loadUnit, unitView, UNITS_TABLE } from '../../../../utils/fewoStore'
import { parseUnitInput, FewoError } from '../../../../../shared/fewo'

// Ändert die Stammdaten (Name, Preise, Zeiten). Kanäle (feeds) und Kalender-Geheimnis bleiben unberührt.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const { tenantId } = await fewoContext(event)
  const unit = await loadUnit(tenantId, String(getRouterParam(event, 'id') || ''))
  let input
  try { input = parseUnitInput(await readBody(event).catch(() => ({}))) } catch (e) { if (e instanceof FewoError) throw createError({ statusCode: 400, message: e.message }); throw e }
  const next = { ...unit, ...input, updated: new Date().toISOString() }
  await getDynamoClient().send(new PutCommand({ TableName: UNITS_TABLE, Item: next }))
  return { success: true, unit: unitView(next) }
})
