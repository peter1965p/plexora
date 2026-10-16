import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { requireAuth } from '../../../utils/verifyAuth'
import { COMMENTS_TABLE } from '../../../utils/siteVisitor'
import { COMMENT_STATUS } from '../../../../shared/siteVisitors'

// Kommentar freigeben, verbergen oder wieder auf "wartet" setzen. Nur diese drei Werte.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const tenantId = await requireTenantId(event)
  const id = String(getRouterParam(event, 'id') || '')
  const body: any = await readBody(event).catch(() => ({}))
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 404, message: 'Kommentar nicht gefunden' })
  if (!COMMENT_STATUS.includes(body?.status)) throw createError({ statusCode: 400, message: 'Ungültiger Status.' })
  try {
    await getDynamoClient().send(new UpdateCommand({ TableName: COMMENTS_TABLE, Key: { tenantId, commentId: id }, UpdateExpression: 'SET #st = :s, moderated = :m', ConditionExpression: 'attribute_exists(commentId)', ExpressionAttributeNames: { '#st': 'status' }, ExpressionAttributeValues: { ':s': body.status, ':m': new Date().toISOString() } }))
  } catch (e: any) { if (e?.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 404, message: 'Kommentar nicht gefunden' }); throw e }
  return { success: true, status: body.status }
})
