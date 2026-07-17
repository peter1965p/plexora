import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const auth     = requireAuth(event)
  const tenantId = await resolveUserId(auth.email)
  const ruleId   = getRouterParam(event, 'id') || ''
  const body     = await readBody(event)
  const dynamo   = getDynamoClient()

  try {
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-newsletter-automation-rules',
      Key: { tenantId, ruleId },
      ConditionExpression: 'attribute_exists(tenantId)',
      UpdateExpression: 'SET #n = :n, #trig = :tr, delayDays = :dd, templateId = :tid, campaignId = :cid, #a = :a',
      ExpressionAttributeNames: { '#n': 'name', '#trig': 'trigger', '#a': 'active' },
      ExpressionAttributeValues: {
        ':n':   body.name || 'Regel',
        ':tr':  body.trigger,
        ':dd':  Number(body.delayDays) || 0,
        ':tid': body.templateId || '',
        ':cid': body.campaignId || '',
        ':a':   body.active ?? true,
      },
    }))
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 404, message: 'Regel nicht gefunden' })
    throw err
  }

  return { success: true }
})
