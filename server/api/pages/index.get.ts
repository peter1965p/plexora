import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  const { Items } = await client.send(new ScanCommand({ TableName: 'plexora-pages' }))
  return { pages: Items || [] }
})
