import { loadTenantAndType, computeFreeSlots } from '../../../../utils/termine'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const query = getQuery(event)
  const date = String(query.date || '')
  const typeId = String(query.typeId || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !typeId) {
    throw createError({ statusCode: 400, message: 'date und typeId erforderlich' })
  }

  const { tenantItem, typeItem } = await loadTenantAndType(tenantId, typeId)
  const slots = await computeFreeSlots(tenantId, tenantItem, typeItem, date)
  return { slots }
})
