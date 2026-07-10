import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const orderId = getRouterParam(event, 'id')
  const body    = await readBody(event)
  const dynamo  = getDynamoClient()

  if (body.status !== 'geliefert') {
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-purchase-orders',
      Key: { orderId, userId },
      UpdateExpression: 'SET #st = :st, updatedAt = :u',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':st': body.status, ':u': new Date().toISOString() },
    }))
    return { success: true }
  }

  // 'geliefert' erhöht den Webshop-Produktbestand — Idempotenz über ConditionExpression,
  // damit ein zweites PATCH auf 'geliefert' (Doppelklick, Retry) nicht doppelt bucht.
  try {
    const res = await dynamo.send(new UpdateCommand({
      TableName: 'plexora-purchase-orders',
      Key: { orderId, userId },
      UpdateExpression: 'SET #st = :st, updatedAt = :u',
      ConditionExpression: '#st <> :st',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':st': 'geliefert', ':u': new Date().toISOString() },
      ReturnValues: 'ALL_OLD',
    }))
    const old = res.Attributes as any
    if (old?.productId) {
      await dynamo.send(new UpdateCommand({
        TableName: 'plexora-products',
        Key: { userId, productId: old.productId },
        UpdateExpression: 'SET stock = if_not_exists(stock, :zero) + :q, updated = :u',
        ExpressionAttributeValues: { ':zero': 0, ':q': Number(old.quantity) || 0, ':u': new Date().toISOString() },
      }))
    }
  } catch (err: any) {
    if (err.name !== 'ConditionalCheckFailedException') throw err
    // bereits als 'geliefert' markiert — No-op, kein doppeltes Bestands-Update
  }
  return { success: true }
})
