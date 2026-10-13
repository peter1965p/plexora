import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { fewoContext, newIcalToken, unitView, UNITS_TABLE } from '../../../utils/fewoStore'
import { parseUnitInput, FewoError } from '../../../../shared/fewo'

export default defineEventHandler(async (event) => {
  const { auth, tenantId } = await fewoContext(event)
  assertNotDemo(auth, 'Im Demo-Zugang können keine Unterkünfte angelegt werden.')
  let input
  try { input = parseUnitInput(await readBody(event).catch(() => ({}))) } catch (e) { if (e instanceof FewoError) throw createError({ statusCode: 400, message: e.message }); throw e }
  const now = new Date().toISOString()
  const unit = { tenantId, unitId: randomUUID(), ...input, icalToken: newIcalToken(), feeds: [], created: now, updated: now }
  await getDynamoClient().send(new PutCommand({ TableName: UNITS_TABLE, Item: unit, ConditionExpression: 'attribute_not_exists(unitId)' }))
  return { success: true, unit: unitView(unit) }
})
