import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

export async function requireTenantId(event: any): Promise<string> {
  const email = getHeader(event, 'x-user-email') || ''
  if (!email) throw createError({ statusCode: 401, message: 'Unauthorized' })
  const res = await getDynamoClient().send(new ScanCommand({
    TableName: 'plexora-nexora',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':e': email },
  }))
  const tenantId = res.Items?.[0]?.tenantId as string | undefined
  if (!tenantId) throw createError({ statusCode: 404, message: 'Tenant nicht gefunden' })
  return tenantId
}
