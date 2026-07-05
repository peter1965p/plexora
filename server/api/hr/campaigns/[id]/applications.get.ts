import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'
import { assertOwner } from '../../../../utils/ownership'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const client = getDynamoClient()

  const campaignScan = await client.send(new ScanCommand({
    TableName: 'plexora-campaigns',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))
  const campaign = campaignScan.Items?.[0]
  if (!campaign) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })
  await assertOwner(event, campaign)

  const result = await client.send(new ScanCommand({
    TableName: 'plexora-applications',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))
  return { applications: result.Items || [] }
})
