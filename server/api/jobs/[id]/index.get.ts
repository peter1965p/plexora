import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const client = getDynamoClient()
  const result = await client.send(new ScanCommand({
    TableName: 'plexora-campaigns',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))
  const campaign = result.Items?.[0]
  if (!campaign) throw createError({ statusCode: 404, message: 'Stelle nicht gefunden' })
  return { campaign }
})
