import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'

const client = new DynamoDBClient({
  region: process.env.NUXT_AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.NUXT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NUXT_AWS_SECRET_ACCESS_KEY,
  },
})

try {
  await client.send(new DescribeTableCommand({ TableName: 'plexora-meta' }))
  console.log('✅ plexora-meta existiert bereits')
} catch {
  await client.send(new CreateTableCommand({
    TableName: 'plexora-meta',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
  }))
  console.log('✅ plexora-meta erstellt!')
}
