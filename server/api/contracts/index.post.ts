import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  const contract = {
    userId: await resolveUserId(body.userId || 'demo-user'),
    contractId:       randomUUID(),
    title:            body.title,
    contractNumber:   body.contractNumber || '',
    type:             body.type || 'service',
    companyId:        body.companyId || '',
    contactId:        body.contactId || '',
    startDate:        body.startDate || '',
    endDate:          body.endDate || '',
    value:            body.value || '',
    billingCycle:     body.billingCycle || 'monthly',
    autoRenew:        !!body.autoRenew,
    noticePeriodDays: body.noticePeriodDays || 0,
    status:           body.status || 'active',
    notes:            body.notes || '',
    created:          new Date().toISOString(),
  }

  await client.send(new PutCommand({ TableName: 'plexora-contracts', Item: contract }))
  return { success: true, contract }
})
