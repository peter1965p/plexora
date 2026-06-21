import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async () => {
  const dynamo = getDynamoClient()
  try {
    const res = await dynamo.send(new ScanCommand({ TableName: 'plexora-licenses' }))
    const licenses = (res.Items || []).sort((a, b) =>
      new Date(b.created).getTime() - new Date(a.created).getTime()
    )
    return { licenses }
  } catch {
    return { licenses: [] }
  }
})
