import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { ownerContext, ownerView, QUOTES_TABLE } from '../../utils/quoteStore'

// Angebote des eigenen Mandanten, neueste zuerst (Status mit Ablauf eingerechnet)
export default defineEventHandler(async (event) => {
  const { tenantId } = await ownerContext(event)
  const res = await getDynamoClient().send(new QueryCommand({ TableName: QUOTES_TABLE, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': tenantId } }))
  const quotes = (res.Items || []).map(q => ownerView(q)).sort((a: any, b: any) => String(b.created).localeCompare(String(a.created)))
  return { quotes }
})
