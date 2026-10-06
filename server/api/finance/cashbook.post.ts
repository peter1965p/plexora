import { resolveUserId } from '../../utils/tenant'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { randomUUID } from 'crypto'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getDynamoClient()
  const entry = {
    userId:      await resolveUserId(requireAuth(event).email),
    cashId:      randomUUID(),
    date:        body.date,
    description: body.description,
    amount:      body.type === 'ausgabe' ? -Math.abs(Number(body.amount)) : Math.abs(Number(body.amount)),
    type:        body.type,
    created:     new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-cashbook', Item: entry }))
  return { success: true, entry }
})
