import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertOwner } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const contractId = getRouterParam(event, 'id')
  const body       = await readBody(event)
  const client     = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-contracts',
    FilterExpression: 'contractId = :id',
    ExpressionAttributeValues: { ':id': contractId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Vertrag nicht gefunden' })
  await assertOwner(event, existing)

  await client.send(new UpdateCommand({
    TableName: 'plexora-contracts',
    Key: { userId: existing.userId, contractId },
    UpdateExpression: 'SET title = :ti, contractNumber = :cn, #ty = :ty, companyId = :coi, contactId = :cti, startDate = :sd, endDate = :ed, #val = :val, billingCycle = :bc, autoRenew = :ar, noticePeriodDays = :np, #st = :st, notes = :no',
    ExpressionAttributeNames: { '#ty': 'type', '#val': 'value', '#st': 'status' },
    ExpressionAttributeValues: {
      ':ti':  body.title,
      ':cn':  body.contractNumber || '',
      ':ty':  body.type || 'service',
      ':coi': body.companyId || '',
      ':cti': body.contactId || '',
      ':sd':  body.startDate || '',
      ':ed':  body.endDate || '',
      ':val': body.value || '',
      ':bc':  body.billingCycle || 'monthly',
      ':ar':  !!body.autoRenew,
      ':np':  body.noticePeriodDays || 0,
      ':st':  body.status || 'active',
      ':no':  body.notes || '',
    }
  }))

  return { success: true }
})
