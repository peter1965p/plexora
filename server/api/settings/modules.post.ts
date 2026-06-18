import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({ region: process.env.AWS_REGION_CUSTOM || 'eu-central-1' })

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { modules } = body
  if (!modules) throw createError({ statusCode: 400, statusMessage: 'modules erforderlich' })

  await client.send(new PutItemCommand({
    TableName: 'plexora-settings',
    Item: {
      settingKey: { S: 'modules' },
      value:      { S: JSON.stringify(modules) },
    }
  }))

  return { success: true }
})
