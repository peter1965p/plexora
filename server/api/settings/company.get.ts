import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { pick, PUBLIC_COMPANY_FIELDS } from '../../utils/publicView'

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
  const isAdmin = event.context.auth?.groups?.includes('admins')
  // Öffentliche Aufrufer (z.B. impressum.vue) ohne Login sowie der Plattform-Admin selbst
  // sehen/bearbeiten Plexoras eigene Firmendaten (scope:'global'); normale eingeloggte
  // Tenants bekommen ihren eigenen Datensatz.
  const scope = isAdmin ? 'global' : (email ? await resolveUserId(email) : 'global')
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'company', scope }
    }))
    const company = { ...DEFAULTS, ...result.Item }
    // Ohne Anmeldung (Impressum/Datenschutz-Seite): nur Anbieterkennzeichnung, keine Bankdaten oder interne Felder
    return { company: email ? company : { ...pick(DEFAULTS, PUBLIC_COMPANY_FIELDS), ...pick(company, PUBLIC_COMPANY_FIELDS) } }
  } catch {
    return { company: DEFAULTS }
  }
})
