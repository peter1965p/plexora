import { GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'invoiceId')
  const dynamo    = getDynamoClient()

  // Rechnung suchen (ohne userId)
  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-finance',
    FilterExpression: 'invoiceId = :id',
    ExpressionAttributeValues: { ':id': invoiceId }
  }))
  const invoice = scan.Items?.[0]
  if (!invoice) throw createError({ statusCode: 404, message: 'Rechnung nicht gefunden' })

  // Aktiven Gateway laden
  const ps = await dynamo.send(new GetCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'payment', scope: 'global' }
  }))
  const gateway = ps.Item?.activeGateway || 'stripe'

  return { invoice, gateway }
})
