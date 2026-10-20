import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { incomingContext, INCOMING_TABLE } from '../../../../utils/einvoiceIncoming'

// Original-XML einer gespeicherten Eingangsrechnung herunterladen
export default defineEventHandler(async (event) => {
  const { userId } = await incomingContext(event, false)
  const id = getRouterParam(event, 'id')
  const it: any = (await getDynamoClient().send(new GetCommand({ TableName: INCOMING_TABLE, Key: { userId, incomingId: id } }))).Item
  if (!it) throw createError({ statusCode: 404, message: 'Nicht gefunden.' })
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${String(it.number || id).replace(/[^\w.-]/g, '_')}.xml"`)
  return it.xml
})
