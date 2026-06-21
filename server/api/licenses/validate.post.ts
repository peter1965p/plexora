import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const { licenseKey } = await readBody(event)
  if (!licenseKey) throw createError({ statusCode: 400, message: 'licenseKey erforderlich' })

  const dynamo = getDynamoClient()
  try {
    const res = await dynamo.send(new GetCommand({
      TableName: 'plexora-licenses',
      Key: { licenseKey: String(licenseKey).toUpperCase() }
    }))

    const lic = res.Item
    if (!lic) return { valid: false, reason: 'Lizenz-Key nicht gefunden' }
    if (lic.status !== 'active') return { valid: false, reason: 'Lizenz ist nicht aktiv' }
    if (lic.validUntil && new Date(lic.validUntil) < new Date()) {
      return { valid: false, reason: 'Lizenz ist abgelaufen' }
    }

    return {
      valid:         true,
      licenseKey:    lic.licenseKey,
      tier:          lic.tier,
      modules:       lic.modules || [],
      customerEmail: lic.customerEmail,
      validFrom:     lic.validFrom,
      validUntil:    lic.validUntil || null,
    }
  } catch {
    return { valid: false, reason: 'Fehler bei der Validierung' }
  }
})
