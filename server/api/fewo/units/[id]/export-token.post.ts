import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { assertNotDemo } from '../../../../utils/demoPolicy'
import { requireAuth } from '../../../../utils/verifyAuth'
import { fewoContext, loadUnit, newIcalToken, unitView, UNITS_TABLE } from '../../../../utils/fewoStore'

// Neuen Kalender-Link erzeugen: der alte Link (z. B. bei Booking.com eingetragen) hört sofort auf zu funktionieren.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const { tenantId } = await fewoContext(event)
  const unit = await loadUnit(tenantId, String(getRouterParam(event, 'id') || ''))
  const icalToken = newIcalToken()
  await getDynamoClient().send(new UpdateCommand({ TableName: UNITS_TABLE, Key: { tenantId, unitId: unit.unitId }, UpdateExpression: 'SET icalToken = :t, updated = :u', ExpressionAttributeValues: { ':t': icalToken, ':u': new Date().toISOString() } }))
  return { success: true, unit: unitView({ ...unit, icalToken }) }
})
