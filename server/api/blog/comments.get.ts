import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { COMMENTS_TABLE } from '../../utils/siteVisitor'

// Alle Kommentare der Webseite für die Verwaltung (neueste zuerst, höchstens 500); optional ?status=pending|approved|hidden
export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const status = String(getQuery(event).status || '')
  const rows = ((await getDynamoClient().send(new QueryCommand({ TableName: COMMENTS_TABLE, KeyConditionExpression: 'tenantId = :t', ExpressionAttributeValues: { ':t': tenantId } }))).Items || [])
    .filter((c: any) => !status || c.status === status)
    .sort((a: any, b: any) => String(b.created).localeCompare(String(a.created))).slice(0, 500)
  return { comments: rows.map(({ tenantId: _t, ...c }: any) => c) }
})
