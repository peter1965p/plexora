import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { incomingContext, INCOMING_TABLE } from '../../../../utils/einvoiceIncoming'

// Stand einer Eingangsrechnung ändern: offen oder bezahlt
export default defineEventHandler(async (event) => {
  const { userId } = await incomingContext(event, true)
  const id = getRouterParam(event, 'id')
  const body: any = await readBody(event).catch(() => ({}))
  if (body?.status !== 'offen' && body?.status !== 'bezahlt') throw createError({ statusCode: 400, message: 'Stand muss „offen“ oder „bezahlt“ sein.' })
  const db = getDynamoClient()
  if (!(await db.send(new GetCommand({ TableName: INCOMING_TABLE, Key: { userId, incomingId: id } }))).Item) throw createError({ statusCode: 404, message: 'Nicht gefunden.' })
  const now = new Date().toISOString()
  await db.send(new UpdateCommand({ TableName: INCOMING_TABLE, Key: { userId, incomingId: id }, UpdateExpression: 'SET #s = :s, updated = :u, paidAt = :p', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': body.status, ':u': now, ':p': body.status === 'bezahlt' ? now : '' } }))
  return { success: true, status: body.status }
})
