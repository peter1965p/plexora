import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const slug   = getRouterParam(event, 'slug') as string
  const client = getDynamoClient()

  const res = await client.send(new ScanCommand({
    TableName: 'plexora-marketing',
    FilterExpression: 'slug = :s OR formId = :s OR campaignId = :s',
    ExpressionAttributeValues: { ':s': slug },
  }))

  const campaign = res.Items?.[0] || null
  return { campaign }
})
