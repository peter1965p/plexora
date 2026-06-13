import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const formId = getRouterParam(event, 'id')
  const client = getDynamoClient()
  const { Items } = await client.send(new QueryCommand({
    TableName: 'plexora-submissions',
    IndexName: 'form-index',
    KeyConditionExpression: 'formId = :fid',
    ExpressionAttributeValues: { ':fid': formId },
  }))
  return { submissions: Items || [] }
})
