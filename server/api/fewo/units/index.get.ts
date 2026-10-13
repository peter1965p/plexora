import { fewoContext, listUnits, unitView } from '../../../utils/fewoStore'

export default defineEventHandler(async (event) => {
  const { tenantId } = await fewoContext(event)
  const units = (await listUnits(tenantId)).sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return { units: units.map(unitView) }
})
