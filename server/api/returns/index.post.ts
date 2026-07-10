import Stripe from 'stripe'
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const body = await readBody(event)
  const dynamo = getDynamoClient()

  const source   = body?.source === 'pos' ? 'pos' : 'webshop'
  const originId = body?.originId as string
  const reqItems = Array.isArray(body?.items) ? body.items : []
  if (!originId || !reqItems.length) throw createError({ statusCode: 400, message: 'originId und items erforderlich' })

  // 1. Origin serverseitig laden + Ownership verifizieren (nie dem Client vertrauen)
  let originItems: any[] = []
  let stripeSessionId: string | null = null

  if (source === 'webshop') {
    const ordersRes = await dynamo.send(new QueryCommand({
      TableName: 'plexora-orders',
      IndexName: 'sellerUserId-index',
      KeyConditionExpression: 'sellerUserId = :s',
      ExpressionAttributeValues: { ':s': userId },
    }))
    const order = (ordersRes.Items || []).find((o: any) => o.orderId === originId)
    if (!order) throw createError({ statusCode: 404, message: 'Bestellung nicht gefunden' })
    if (order.status !== 'paid' || !order.stripeSessionId) {
      throw createError({ statusCode: 400, message: 'Nur bezahlte Bestellungen mit Stripe-Zahlung können erstattet werden' })
    }
    originItems = order.items || []
    stripeSessionId = order.stripeSessionId
  } else {
    const saleRes = await dynamo.send(new GetCommand({ TableName: 'plexora-retail-sales', Key: { userId, saleId: originId } }))
    if (!saleRes.Item) throw createError({ statusCode: 404, message: 'Verkauf nicht gefunden' })
    originItems = (saleRes.Item.items || []).map((i: any) => ({ productId: i.productId, name: i.name, price: i.unitPrice, qty: i.qty }))
  }

  // 2. Über-Retoure-Validierung: bereits zurückgegebene Menge pro Produkt gegen Original-Menge prüfen
  const priorReturnsRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-returns',
    KeyConditionExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': userId },
  }))
  const priorForOrigin = (priorReturnsRes.Items || []).filter((r: any) => r.originId === originId)
  const alreadyReturned: Record<string, number> = {}
  for (const r of priorForOrigin) {
    for (const line of (r.items || [])) {
      alreadyReturned[line.productId] = (alreadyReturned[line.productId] || 0) + Number(line.qty || 0)
    }
  }

  const returnItems: any[] = []
  let refundAmount = 0
  for (const req of reqItems) {
    const origLine = originItems.find((i: any) => i.productId === req.productId)
    if (!origLine) throw createError({ statusCode: 400, message: `Produkt ${req.productId} war nicht Teil der Original-Transaktion` })
    const qty = Math.max(1, Number(req.qty) || 0)
    const already = alreadyReturned[req.productId] || 0
    const origQty = Number(origLine.qty) || 0
    if (already + qty > origQty) {
      throw createError({ statusCode: 400, message: `Zu viel zurückgegeben für ${origLine.name} (max. ${origQty - already} noch möglich)` })
    }
    const unitPrice = Number(origLine.price) || 0
    const lineTotal = Math.round(unitPrice * qty * 100) / 100
    returnItems.push({ productId: req.productId, name: origLine.name, qty, unitPrice, lineTotal })
    refundAmount += lineTotal
  }
  refundAmount = Math.round(refundAmount * 100) / 100

  const returnId = randomUUID()
  let stripeRefundId: string | null = null

  // 3. Echte Stripe-Rückerstattung nur für Webshop-Bestellungen — POS hat keine
  // echte Zahlungsintegration (Kartenzahlung ist dort nur ein UI-Label).
  if (source === 'webshop') {
    let stripeKey = useRuntimeConfig().stripeSecretKey as string
    try {
      const ps = await dynamo.send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'payment', scope: 'global' } }))
      if (ps.Item?.stripeSecretKey) stripeKey = ps.Item.stripeSecretKey
    } catch {}
    const stripe = new Stripe(stripeKey)

    try {
      const session = await stripe.checkout.sessions.retrieve(stripeSessionId!)
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
      if (!paymentIntentId) throw new Error('Keine Payment-Intent auf der Session gefunden')
      const refund = await stripe.refunds.create(
        { payment_intent: paymentIntentId, amount: Math.round(refundAmount * 100), reason: 'requested_by_customer' },
        { idempotencyKey: returnId },
      )
      stripeRefundId = refund.id
    } catch (err: any) {
      console.error('Stripe-Rückerstattung fehlgeschlagen:', err.message)
      throw createError({ statusCode: 502, message: `Rückerstattung fehlgeschlagen: ${err.message}` })
    }
  }
  // POS-Retouren: kein Stripe-Call, stripeRefundId bleibt strukturell null.

  // 4. Retoure-Datensatz erst schreiben, NACHDEM eine evtl. nötige Rückerstattung
  // erfolgreich war — kein Datensatz für eine Erstattung, die nicht stattgefunden hat.
  const item = {
    userId,
    returnId,
    source,
    originId,
    items: returnItems,
    refundAmount,
    reason: body.reason || '',
    stripeRefundId,
    stripeSessionId: source === 'webshop' ? stripeSessionId : null,
    status: 'completed',
    created: new Date().toISOString(),
    createdBy: email,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-returns', Item: item }))

  // 5. Bestand pro Zeile erhöhen
  for (const line of returnItems) {
    const p = await dynamo.send(new GetCommand({ TableName: 'plexora-products', Key: { userId, productId: line.productId } }))
    if (!p.Item) continue
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-products',
      Key: { userId, productId: line.productId },
      UpdateExpression: 'SET stock = if_not_exists(stock, :zero) + :q, updated = :u',
      ExpressionAttributeValues: { ':zero': 0, ':q': line.qty, ':u': new Date().toISOString() },
    }))
  }

  return { success: true, return: item }
})
