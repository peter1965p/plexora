import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertOwner } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const contractId = getRouterParam(event, 'id')
  const client     = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-contracts',
    FilterExpression: 'contractId = :id',
    ExpressionAttributeValues: { ':id': contractId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Vertrag nicht gefunden' })
  await assertOwner(event, existing)

  await client.send(new DeleteCommand({
    TableName: 'plexora-contracts',
    Key: { userId: existing.userId, contractId }
  }))

  return { success: true }
})
