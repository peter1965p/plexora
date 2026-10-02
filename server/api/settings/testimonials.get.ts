import { requireAdmin } from '../../utils/verifyAuth'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new GetCommand({
    TableName: 'plexora-settings', Key: { settingId: 'testimonials', scope: 'global' },
  }))
  return { items: res.Item?.items || [] }
})
