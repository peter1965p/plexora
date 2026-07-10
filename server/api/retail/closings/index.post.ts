import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireAuth } from '../../../utils/verifyAuth'
import { resolveUserId } from '../../../utils/tenant'

export default defineEventHandler(async (event) => {
  const { email } = requireAuth(event)
  const userId = await resolveUserId(email)
  const body = await readBody(event)
  const dynamo = getDynamoClient()

  const dayKey = (body?.dayKey as string) || new Date().toISOString().slice(0, 10)

  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-retail-sales',
    KeyConditionExpression: 'userId = :u',
    ExpressionAttributeValues: { ':u': userId },
  }))
  const daySales = (res.Items || []).filter((s: any) => s.dayKey === dayKey)

  const totalByMethod = { bar: 0, karte: 0 }
  let totalGross = 0
  for (const sale of daySales) {
    const amount = Number(sale.totalGross) || 0
    totalGross += amount
    if (sale.paymentMethod === 'karte') totalByMethod.karte += amount
    else totalByMethod.bar += amount
  }

  const item = {
    userId,
    closingId: dayKey,
    totalGross: Math.round(totalGross * 100) / 100,
    totalByMethod: {
      bar:   Math.round(totalByMethod.bar * 100) / 100,
      karte: Math.round(totalByMethod.karte * 100) / 100,
    },
    saleCount: daySales.length,
    closedAt: new Date().toISOString(),
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-retail-closings', Item: item }))
  return { closing: item }
})
