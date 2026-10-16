import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { parseCommentsMode } from '../../../shared/siteVisitors'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const t = (await getDynamoClient().send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))).Item
  return { mode: parseCommentsMode(t?.blogCommentsMode) }
})
