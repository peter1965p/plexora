import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  const res = await client.send(new GetCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'modules', scope: 'global' }
  }))
  return { modules: res.Item?.modules || null }
})
