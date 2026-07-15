import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)

  const dynamo = getDynamoClient()
  try {
    const res = await dynamo.send(new ScanCommand({
      TableName: 'plexora-licenses',
      FilterExpression: 'customerEmail = :e',
      ExpressionAttributeValues: { ':e': email }
    }))

    // Aktive zuerst, danach nach Datum sortiert
    const licenses = (res.Items || []).sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (b.status === 'active' && a.status !== 'active') return 1
      return new Date(b.created).getTime() - new Date(a.created).getTime()
    })

    return { license: licenses[0] || null, licenses }
  } catch {
    return { license: null, licenses: [] }
  }
})
