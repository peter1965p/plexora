import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { loadTenantAndType, computeFreeSlots, toMinutes, toHHMM } from '../../../../utils/termine'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const body = await readBody(event)

  const typeId = String(body.typeId || '')
  const date = String(body.date || '')
  const startTime = String(body.startTime || '')
  const customerName = String(body.customerName || '').trim()
  const customerEmail = String(body.customerEmail || '').trim()

  if (!typeId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !customerName || !customerEmail) {
    throw createError({ statusCode: 400, message: 'Pflichtfelder fehlen' })
  }

  const { tenantItem, typeItem } = await loadTenantAndType(tenantId, typeId)

  const freeSlots = await computeFreeSlots(tenantId, tenantItem, typeItem, date)
  if (!freeSlots.includes(startTime)) {
    throw createError({ statusCode: 409, message: 'Dieser Termin ist nicht mehr verfügbar' })
  }

  const durationMinutes = Number(typeItem.durationMinutes) || 30
  const endTime = toHHMM(toMinutes(startTime) + durationMinutes)

  const dynamo = getDynamoClient()
  const bookingId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    bookingId,
    typeId,
    typeName: typeItem.name,
    durationMinutes,
    date,
    startTime,
    endTime,
    customerName,
    customerEmail,
    customerPhone: String(body.customerPhone || ''),
    notes: String(body.notes || ''),
    status: 'confirmed',
    source: 'public',
    googleEventId: '',
    googleMeetLink: '',
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-termine-bookings', Item: item }))

  return {
    booking: {
      bookingId, typeName: item.typeName, date, startTime, endTime,
      customerName, meetLink: item.googleMeetLink || null,
    },
  }
})
