import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const auth = requireAuth(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()

  // Nur tatsächlich mitgeschickte Felder aktualisieren (z.B. reiner Avatar-Upload
  // darf den zuvor gespeicherten Namen nicht mit einem leeren PutCommand überschreiben).
  const names: Record<string, string> = { '#u': 'updated' }
  const values: Record<string, unknown> = { ':updated': new Date().toISOString() }
  const sets: string[] = ['#u = :updated']

  if (typeof body.name === 'string') {
    names['#n'] = 'name'
    values[':n'] = body.name
    sets.push('#n = :n')
  }
  if (typeof body.avatarUrl === 'string') {
    names['#a'] = 'avatarUrl'
    values[':a'] = body.avatarUrl
    sets.push('#a = :a')
  }

  await dynamo.send(new UpdateCommand({
    TableName: 'plexora-user-profiles',
    Key: { email: auth.email },
    UpdateExpression: `SET ${sets.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }))

  return { success: true }
})
