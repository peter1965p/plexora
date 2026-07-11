import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { TIER_MODULES } from '../../utils/license'
import { requireAdmin } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const key  = String(getRouterParam(event, 'key')).toUpperCase()
  const body = await readBody(event)
  const dynamo = getDynamoClient()

  const setParts: string[]          = []
  const names:    Record<string, string> = {}
  const values:   Record<string, any>   = {}

  if (body.status !== undefined) {
    setParts.push('#st = :st')
    names['#st']  = 'status'
    values[':st'] = body.status
  }
  if (body.tier !== undefined) {
    setParts.push('tier = :t, modules = :m')
    values[':t'] = body.tier
    values[':m'] = TIER_MODULES[body.tier] || []
  }
  if (body.validUntil !== undefined) {
    setParts.push('validUntil = :vu')
    values[':vu'] = body.validUntil
  }
  if (body.note !== undefined) {
    setParts.push('note = :n')
    values[':n'] = body.note
  }

  setParts.push('updated = :upd')
  values[':upd'] = new Date().toISOString()

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-licenses',
    Key: { licenseKey: key },
    UpdateExpression: `SET ${setParts.join(', ')}`,
    ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
    ExpressionAttributeValues: values,
  }))

  return { success: true }
})
