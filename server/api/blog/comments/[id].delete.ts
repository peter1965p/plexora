import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { requireAuth } from '../../../utils/verifyAuth'
import { COMMENTS_TABLE } from '../../../utils/siteVisitor'

export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const tenantId = await requireTenantId(event)
  const id = String(getRouterParam(event, 'id') || '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw createError({ statusCode: 404, message: 'Kommentar nicht gefunden' })
  await getDynamoClient().send(new DeleteCommand({ TableName: COMMENTS_TABLE, Key: { tenantId, commentId: id } }))
  return { success: true }
})
