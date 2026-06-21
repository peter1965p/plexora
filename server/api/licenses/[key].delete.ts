import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const key    = String(getRouterParam(event, 'key')).toUpperCase()
  const dynamo = getDynamoClient()
  await dynamo.send(new DeleteCommand({
    TableName: 'plexora-licenses',
    Key: { licenseKey: key }
  }))
  return { success: true }
})
