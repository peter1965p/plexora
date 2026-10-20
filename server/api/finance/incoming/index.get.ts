import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { incomingContext, INCOMING_TABLE } from '../../../utils/einvoiceIncoming'

// Eingangsrechnungen des eigenen Mandanten (ohne das Original-XML), neueste zuerst
export default defineEventHandler(async (event) => {
  const { userId } = await incomingContext(event, false)
  const res = await getDynamoClient().send(new QueryCommand({ TableName: INCOMING_TABLE, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': userId } }))
  const rows = (res.Items || []).map(({ xml: _x, ...r }: any) => r).sort((a: any, b: any) => String(b.created).localeCompare(String(a.created)))
  return { records: rows }
})
