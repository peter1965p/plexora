import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, waitUntilTableExists } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { readFileSync } from 'fs'

// .env laden
const env = readFileSync('.env', 'utf-8')
for (const line of env.split('\n')) {
  const [key, ...val] = line.split('=')
  if (key && val.length) process.env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '')
}

const client = new DynamoDBClient({
  region: 'eu-central-1',
  credentials: {
    accessKeyId:     process.env.NUXT_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.NUXT_AWS_SECRET_ACCESS_KEY,
  },
})
const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
})

// Tabelle anlegen falls nicht vorhanden
try {
  await client.send(new DescribeTableCommand({ TableName: 'plexora-licenses' }))
  console.log('ℹ️  Tabelle plexora-licenses existiert bereits')
} catch {
  console.log('⚙️  Erstelle Tabelle plexora-licenses...')
  await client.send(new CreateTableCommand({
    TableName:            'plexora-licenses',
    BillingMode:          'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'licenseKey', AttributeType: 'S' }],
    KeySchema:            [{ AttributeName: 'licenseKey', KeyType: 'HASH' }],
  }))
  await waitUntilTableExists({ client, maxWaitTime: 30 }, { TableName: 'plexora-licenses' })
  console.log('✅ Tabelle erstellt')
}

// God License schreiben
const ALL_MODULES = [
  'crm', 'support', 'finance', 'projects', 'contracts',
  'hr', 'analytics', 'shop', 'pagebuilder', 'forms', 'marketing'
]

const license = {
  licenseKey:      'PLXR-GOD0-MODE-0000-PETE',
  customerEmail:   'news24regional@gmail.com',
  customerName:    'Peter Päffgen',
  tier:            'enterprise',
  status:          'active',
  modules:         ALL_MODULES,
  validFrom:       new Date().toISOString(),
  validUntil:      null,
  note:            'God License — alle Module, kein Ablaufdatum',
  createdManually: true,
  created:         new Date().toISOString(),
  updated:         new Date().toISOString(),
}

await dynamo.send(new PutCommand({ TableName: 'plexora-licenses', Item: license }))

console.log('\n✅ God License angelegt:')
console.log(`   Key:    ${license.licenseKey}`)
console.log(`   Email:  ${license.customerEmail}`)
console.log(`   Tier:   ${license.tier}`)
console.log(`   Module: ${ALL_MODULES.join(', ')}`)
