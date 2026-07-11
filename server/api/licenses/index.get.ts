import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAdmin } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
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
