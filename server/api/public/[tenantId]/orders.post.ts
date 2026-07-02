import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*' })

  const tenantId = getRouterParam(event, 'tenantId') || ''
  const body     = await readBody(event)
  const dynamo   = getDynamoClient()

  const cart = Array.isArray(body?.items) ? body.items : []
  if (!cart.length) throw createError({ statusCode: 400, message: 'Warenkorb ist leer' })
  if (!body?.customerName || !body?.phone) throw createError({ statusCode: 400, message: 'Name und Telefon erforderlich' })

  // Menü serverseitig laden — Preise und Verfügbarkeit nie dem Client vertrauen
  const menuRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-menu',
    KeyConditionExpression: 'tenantId = :t',
    ExpressionAttributeValues: { ':t': tenantId },
  }))
  const menuById = new Map((menuRes.Items || []).map((i: any) => [i.itemId, i]))

  const items = []
  let total = 0
  for (const line of cart) {
    const menuItem = menuById.get(line.itemId)
    if (!menuItem || !menuItem.available) continue
    const qty = Math.max(1, Math.min(20, Number(line.qty) || 1))
    const price = Number(menuItem.price) || 0
    items.push({ itemId: menuItem.itemId, name: menuItem.name, price, qty })
    total += price * qty
  }
  if (!items.length) throw createError({ statusCode: 400, message: 'Keine gültigen Artikel im Warenkorb' })

  const orderId = randomUUID()
  const now = new Date().toISOString()
  const order = {
    tenantId,
    orderId,
    items,
    total: Math.round(total * 100) / 100,
    customerName: String(body.customerName).slice(0, 100),
    phone:        String(body.phone).slice(0, 40),
    pickupTime:   body.pickupTime === 'sofort' ? 'sofort' : String(body.pickupTime || 'sofort').slice(0, 40),
    notes:        String(body.notes || '').slice(0, 300),
    status: 'neu',
    createdAt: now,
    updatedAt: now,
  }

  await dynamo.send(new PutCommand({ TableName: 'plexora-gastro-orders', Item: order }))
  return { orderId, total: order.total }
})
