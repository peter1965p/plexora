import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()

  const theme = {
    userId:  body.userId || 'demo-user',
    themeId: randomUUID(),
    name:    body.name || 'Mein Theme',
    vars:    body.vars || {},
    created: new Date().toISOString(),
  }

  await client.send(new PutCommand({ TableName: 'plexora-themes', Item: theme }))
  return { success: true, theme }
})
