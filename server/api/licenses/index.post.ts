import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { generateLicenseKey, TIER_MODULES } from '../../utils/license'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { customerEmail, tier = 'pro', validUntil = null, note = '' } = body

  if (!customerEmail) throw createError({ statusCode: 400, message: 'customerEmail erforderlich' })
  if (!TIER_MODULES[tier]) throw createError({ statusCode: 400, message: 'Ungültiger Tier' })

  const dynamo     = getDynamoClient()
  const licenseKey = generateLicenseKey()
  const now        = new Date().toISOString()

  const item = {
    licenseKey,
    customerEmail,
    tier,
    status:          'active',
    modules:         TIER_MODULES[tier],
    validFrom:       now,
    validUntil,
    note,
    createdManually: true,
    created:         now,
    updated:         now,
  }

  await dynamo.send(new PutCommand({ TableName: 'plexora-licenses', Item: item }))
  return { licenseKey, license: item }
})
