import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertOwner } from '../../../utils/ownership'

const ALLOWED_STATUSES = ['pending', 'overdue', 'paid', 'dunning_1', 'dunning_2', 'dunning_3']

// Manuelles Setzen des Rechnungs-Status (z.B. "Bezahlt" ohne Bank-Match, oder eine
// Mahnstufe wieder zurücksetzen) — bislang änderte sich der Status nur als Nebeneffekt
// von /dunning (Mahnung senden) oder dem Bank-Import-Abgleich, es gab keinen direkten Weg.
export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'id')
  const body      = await readBody(event)
  const status    = String(body.status || '')
  if (!ALLOWED_STATUSES.includes(status)) {
    throw createError({ statusCode: 400, message: 'Ungültiger Status' })
  }

  const dynamo = getDynamoClient()
  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'invoiceId = :id',
    ExpressionAttributeValues: { ':id': invoiceId },
  }))
  const invoice = scan.Items?.[0]
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })
  await assertOwner(event, invoice)

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-finance',
    Key: { userId: invoice.userId, invoiceId },
    UpdateExpression: 'SET #st = :st',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':st': status },
  }))

  return { success: true, status }
})
