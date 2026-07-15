import { requireAuth } from '../../utils/verifyAuth'
import { resolveUserId } from '../../utils/tenant'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = {
  theme: 'dark',
  accent: '#6C3FE8',
  accentRgb: '234, 88, 12',
}

// Wird u.a. beim App-Mount für JEDE Seite geladen (auch öffentliche, ausgeloggte
// Seiten) — daher hier bewusst kein throw bei fehlendem Auth: ohne Login bleiben
// einfach die Defaults aktiv (identisch zum bisherigen Verhalten).
export default defineEventHandler(async (event) => {
  const client = getDynamoClient()
  try {
    const auth   = requireAuth(event)
    const scope  = await resolveUserId(auth.email)
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'theme', scope }
    }))
    return { theme: result.Item || DEFAULTS }
  } catch {
    return { theme: DEFAULTS }
  }
})
