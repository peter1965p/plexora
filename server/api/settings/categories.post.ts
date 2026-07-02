import { demoGuard } from '../../utils/demoGuard'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const ALLOWED_AREAS = ['blog', 'shop']

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  demoGuard(body?.userId)

  const area = body?.area as string
  const categories = body?.categories as string[]
  if (!ALLOWED_AREAS.includes(area)) throw createError({ statusCode: 400, message: 'Ungültiger Bereich' })
  if (!Array.isArray(categories)) throw createError({ statusCode: 400, message: 'categories muss ein Array sein' })

  const client = getDynamoClient()
  await client.send(new UpdateCommand({
    TableName: 'plexora-settings',
    Key: { settingId: 'categories', scope: 'global' },
    UpdateExpression: 'SET #area = :cats, updated = :u',
    ExpressionAttributeNames: { '#area': area },
    ExpressionAttributeValues: {
      ':cats': categories,
      ':u': new Date().toISOString(),
    },
  }))

  return { success: true }
})
