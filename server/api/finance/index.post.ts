import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  // Mehrzeilige Positionen (aus dem Positionen-Editor) haben Vorrang; Betrag wird daraus summiert.
  const items  = Array.isArray(body.items) && body.items.length
    ? body.items.map((i: any) => ({ description: i.description || 'Dienstleistung', qty: Number(i.qty) || 1, price: Number(i.price) || 0 }))
    : undefined
  const amount = items ? items.reduce((sum: number, i: any) => sum + i.qty * i.price, 0) : Number(body.amount) || 0

  const invoice = {
    userId: await resolveUserId(event.context.auth?.email || 'demo-user'),
    invoiceId:   randomUUID(),
    number:      'INV-' + Date.now(),
    client:      body.client,
    clientEmail: body.clientEmail || '',
    description: body.description || items?.[0]?.description || '',
    amount,
    ...(items ? { items } : {}),
    status:      body.status || 'pending',
    dueDate:     body.dueDate,
    mailSent:    false,
    created:     new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-finance', Item: invoice }))
  return { success: true, invoice }
})
