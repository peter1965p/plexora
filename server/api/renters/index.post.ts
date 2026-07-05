import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireTenantId } from '../../utils/auth'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const { userId: _ignoredUserId, ...renterBody } = body || {}
  const dynamo = getDynamoClient()
  const renterId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    renterId,
    ...renterBody,
    createdAt: now,
    updatedAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-renters', Item: item }))

  // Mietvertrag automatisch im Verträge-Modul anlegen
  try {
    const kaltmiete   = parseFloat(renterBody.kaltmiete) || 0
    const nebenkosten = parseFloat(renterBody.nebenkosten) || 0
    const warmmiete   = kaltmiete + nebenkosten
    const contract = {
      userId:           tenantId,
      contractId:       randomUUID(),
      title:            `Mietvertrag – ${renterBody.name}`,
      contractNumber:   '',
      type:             'rental',
      companyId:        '',
      contactId:        '',
      startDate:        renterBody.contractStart || '',
      endDate:          renterBody.contractEnd || '',
      value:            warmmiete ? String(warmmiete) : '',
      billingCycle:     'monthly',
      autoRenew:        false,
      noticePeriodDays: 90,
      status:           'active',
      notes:            `Automatisch erstellt aus Immobilien-Modul${renterBody.propertyName ? ' · Objekt: ' + renterBody.propertyName : ''}`,
      created:          now,
    }
    await dynamo.send(new PutCommand({ TableName: 'plexora-contracts', Item: contract }))
  } catch {}

  return { renter: item }
})
