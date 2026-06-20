import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'
export default defineEventHandler(async (event) => {
  const body    = await readBody(event)
  const dynamo  = getDynamoClient()
  const supplierId = randomUUID()
  await dynamo.send(new PutCommand({
    TableName: 'plexora-suppliers',
    Item: { supplierId, userId: 'global', ...body, created: new Date().toISOString() }
  }))
  return { success: true, supplierId }
})
