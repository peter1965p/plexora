import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  const result = await client.send(new ScanCommand({ TableName: 'plexora-companies' }))
  return { companies: result.Items || [] }
})
