import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'

const DEFAULTS = {
  legalName: '',
  representedBy: '',
  street: '',
  zipCity: '',
  country: 'Deutschland',
  email: '',
  phone: '',
  vatId: '',
  register: '',
  registerCourt: '',
  iban: '',
  bic: '',
  bankName: '',
  paymentNote: '',
}

export default defineEventHandler(async (event) => {
  const client = getDynamoClient()
  const email = event.context.auth?.email
  // Öffentliche Aufrufer (z.B. impressum.vue) ohne Login sehen weiterhin Plexoras eigene
  // Firmendaten (scope:'global'); eingeloggte Tenants bekommen ihren eigenen Datensatz.
  const scope = email ? await resolveUserId(email) : 'global'
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'company', scope }
    }))
    return { company: { ...DEFAULTS, ...result.Item } }
  } catch {
    return { company: DEFAULTS }
  }
})
