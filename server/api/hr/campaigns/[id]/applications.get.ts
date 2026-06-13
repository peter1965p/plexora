import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const client = getDynamoClient()
  const result = await client.send(new ScanCommand({
    TableName: 'plexora-applications',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))
  return { applications: result.Items || [] }
})
