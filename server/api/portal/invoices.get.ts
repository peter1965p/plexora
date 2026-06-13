import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const email  = getQuery(event).email as string
  const client = getDynamoClient()
  const result = await client.send(new ScanCommand({ TableName: 'plexora-finance' }))
  const all    = result.Items || []
  const filtered = email ? all.filter((i: any) => i.clientEmail === email) : []
  return { invoices: filtered }
})
