import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth  = requireAuth(event)
  const scope = await resolveUserId(auth.email)
  const client = getDynamoClient()
  const res = await client.send(new GetCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'modules', scope }
  }))
  return { modules: res.Item?.modules || null }
})
