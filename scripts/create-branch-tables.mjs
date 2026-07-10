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

async function create(name, sk) {
  if (await exists(name)) { console.log(`✓ ${name} exists`); return }
  await client.send(new CreateTableCommand({
    TableName: name, BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'tenantId', AttributeType: 'S' },
      { AttributeName: sk,         AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'tenantId', KeyType: 'HASH' },
      { AttributeName: sk,         KeyType: 'RANGE' },
    ],
  }))
  console.log(`✅ Created ${name}`)
}

await create('plexora-retail-products',     'productId')
await create('plexora-retail-sales',        'saleId')
await create('plexora-retail-closings',     'closingId')
await create('plexora-handwerk-baustellen', 'baustelleId')
await create('plexora-handwerk-aufmasse',   'aufmassId')
await create('plexora-praxis-patienten',    'patientId')
await create('plexora-praxis-termine',      'terminId')
await create('plexora-praxis-rezepte',      'rezeptId')
console.log('Done.')
