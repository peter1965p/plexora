import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
export default defineEventHandler(async () => {
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new ScanCommand({ TableName: 'plexora-purchase-orders' }))
  return { orders: (res.Items || []).sort((a: any, b: any) => b.created?.localeCompare(a.created)) }
})
