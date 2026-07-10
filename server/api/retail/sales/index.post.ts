import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()

  const cartItems = Array.isArray(body?.items) ? body.items : []
  const saleItems: any[] = []
  let totalGross = 0

  for (const line of cartItems) {
    const productId = line.productId
    if (!productId) continue
    const res = await dynamo.send(new GetCommand({ TableName: 'plexora-retail-products', Key: { tenantId, productId } }))
    const product = res.Item
    if (!product || product.active === false) continue
    const qty = Math.max(1, Math.min(999, Number(line.qty) || 1))
    const unitPrice = Number(product.price) || 0
    const lineTotal = Math.round(unitPrice * qty * 100) / 100
    saleItems.push({ productId, name: product.name, qty, unitPrice, lineTotal })
    totalGross += lineTotal

    const newStock = Math.max(0, (Number(product.stock) || 0) - qty)
    await dynamo.send(new PutCommand({
      TableName: 'plexora-retail-products',
      Item: { ...product, stock: newStock, updatedAt: new Date().toISOString() },
    }))
  }

  if (!saleItems.length) throw createError({ statusCode: 400, message: 'Keine gültigen Produkte im Warenkorb' })

  const now = new Date()
  const saleId = randomUUID()
  const item = {
    tenantId,
    saleId,
    items: saleItems,
    totalGross: Math.round(totalGross * 100) / 100,
    paymentMethod: body.paymentMethod === 'karte' ? 'karte' : 'bar',
    dayKey: now.toISOString().slice(0, 10),
    createdAt: now.toISOString(),
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-retail-sales', Item: item }))
  return { sale: item }
})
