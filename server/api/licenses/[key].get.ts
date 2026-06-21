import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const key    = getRouterParam(event, 'key')
  const dynamo = getDynamoClient()
  const res    = await dynamo.send(new GetCommand({
    TableName: 'plexora-licenses',
    Key: { licenseKey: String(key).toUpperCase() }
  }))
  if (!res.Item) throw createError({ statusCode: 404, message: 'Lizenz nicht gefunden' })
  return { license: res.Item }
})
