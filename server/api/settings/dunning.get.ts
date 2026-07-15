import { requireAdmin } from '../../utils/verifyAuth'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = {
  level1: { active: true, days: 5,  fee: 0,  text: 'Wir möchten Sie freundlich daran erinnern, dass die folgende Rechnung noch offen ist.' },
  level2: { active: true, days: 14, fee: 15, text: 'Trotz unserer ersten Mahnung haben wir noch keinen Zahlungseingang verbuchen können.' },
  level3: { active: true, days: 30, fee: 40, inkasso: true, text: 'Dies ist unsere letzte Mahnung. Bei Nichtbegleichung übergeben wir die Forderung an ein Inkassounternehmen.' }
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'dunning', scope: 'global' }
    }))
    return { settings: result.Item || DEFAULTS }
  } catch {
    return { settings: DEFAULTS }
  }
})
