import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertOwner } from '../../../utils/ownership'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const client     = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-campaigns',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))

  const campaign = scan.Items?.[0]
  if (!campaign) throw createError({ statusCode: 404, message: 'Stellenausschreibung nicht gefunden' })
  await assertOwner(event, campaign)

  return { campaign }
})
