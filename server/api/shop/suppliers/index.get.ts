import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
export default defineEventHandler(async () => {
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({ TableName: 'plexora-suppliers' }))
  return { suppliers: res.Items || [] }
})
