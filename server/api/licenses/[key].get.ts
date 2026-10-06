import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { pick, PUBLIC_LICENSE_FIELDS } from '../../utils/publicView'

// Abfrage per Lizenzschlüssel: liefert nur Status, Stufe, Module und Gültigkeit, keine Kundendaten.
export default defineEventHandler(async (event) => {
  const key    = getRouterParam(event, 'key')
  const dynamo = getDynamoClient()
  const res    = await dynamo.send(new GetCommand({
    TableName: 'plexora-licenses',
    Key: { licenseKey: String(key).toUpperCase() }
  }))
  if (!res.Item) throw createError({ statusCode: 404, message: 'Lizenz nicht gefunden' })
  return { license: pick(res.Item, PUBLIC_LICENSE_FIELDS) }
})
