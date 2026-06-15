import { UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const themeId = getRouterParam(event, 'id')
  const body    = await readBody(event)
  const client  = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-themes',
    FilterExpression: 'themeId = :id',
    ExpressionAttributeValues: { ':id': themeId }
  }))

  const existing = scan.Items?.[0]
  if (!existing) throw createError({ statusCode: 404, message: 'Theme nicht gefunden' })

  await client.send(new UpdateCommand({
    TableName: 'plexora-themes',
    Key: { userId: existing.userId, themeId },
    UpdateExpression: 'SET #nm = :nm, vars = :vars',
    ExpressionAttributeNames: { '#nm': 'name' },
    ExpressionAttributeValues: {
      ':nm':   body.name || existing.name,
      ':vars': body.vars || existing.vars,
    }
  }))

  return { success: true }
})
