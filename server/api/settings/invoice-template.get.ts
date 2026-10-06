import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { getPresetHtml } from '../../utils/invoicePresets'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(requireAuth(event).email)
  const dynamo = getDynamoClient()

  const res = await dynamo.send(new GetCommand({
    TableName: 'plexora-invoice-templates',
    Key: { userId },
  }))

  const presetKey = res.Item?.presetKey || 'standard'
  const html      = res.Item?.html || getPresetHtml(presetKey)

  return { template: { presetKey, html, updatedAt: res.Item?.updatedAt || null } }
})
