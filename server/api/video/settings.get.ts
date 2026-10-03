import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const res = await getDynamoClient().send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))
  const item = res.Item || {}
  return {
    googleConnected: item.googleConnected ?? false,
    googleEmail: item.googleEmail || '',
    videoFallbackLink: item.videoFallbackLink || '',
  }
})
