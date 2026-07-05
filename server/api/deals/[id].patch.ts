import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertOwner } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const dealId = getRouterParam(event, 'id')
  const body   = await readBody(event)
  const client = getDynamoClient()

  // userId aus DynamoDB holen — nicht aus dem Client vertrauen
  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-deals',
    FilterExpression: 'dealId = :id',
    ExpressionAttributeValues: { ':id': dealId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Deal nicht gefunden' })
  await assertOwner(event, existing)

  await client.send(new UpdateCommand({
    TableName: 'plexora-deals',
    Key: { userId: existing.userId, dealId },
    UpdateExpression: 'SET #nm = :nm, #vl = :vl, stage = :sg, prob = :pb, #st = :st',
    ExpressionAttributeNames: { '#nm': 'name', '#vl': 'value', '#st': 'status' },
    ExpressionAttributeValues: {
      ':nm': body.name,
      ':vl': body.value,
      ':sg': body.stage,
      ':pb': body.prob,
      ':st': body.status,
    }
  }))

  return { success: true }
})
