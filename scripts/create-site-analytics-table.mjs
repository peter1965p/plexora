import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'
import 'dotenv/config'

const client = new DynamoDBClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId:     process.env.NUXT_AWS_ACCESS_KEY_ID?.replace(/"/g, ''),
    secretAccessKey: process.env.NUXT_AWS_SECRET_ACCESS_KEY?.replace(/"/g, ''),
  },
})

async function exists(name) {
  try { await client.send(new DescribeTableCommand({ TableName: name })); return true }
  catch { return false }
}

async function create(name, keySchema, attrs) {
  if (await exists(name)) { console.log(`✓ ${name} exists`); return }
  await client.send(new CreateTableCommand({
    TableName: name,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: attrs.map(a => ({ AttributeName: a, AttributeType: 'S' })),
    KeySchema: keySchema,
  }))
  console.log(`✅ Created ${name}`)
}

await create(
  'plexora-site-analytics',
  [{ AttributeName: 'tenantId', KeyType: 'HASH' }, { AttributeName: 'rowKey', KeyType: 'RANGE' }],
  ['tenantId', 'rowKey'],
)

console.log('Done.')
