import { DynamoDBClient, CreateTableCommand, DescribeTableCommand, UpdateTimeToLiveCommand } from '@aws-sdk/client-dynamodb'
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

async function waitActive(name) {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await client.send(new DescribeTableCommand({ TableName: name }))
      if (res.Table?.TableStatus === 'ACTIVE') return
    } catch {}
    await new Promise(r => setTimeout(r, 2000))
  }
}

async function create(name, keySchema, attrs, gsis) {
  if (await exists(name)) { console.log(`✓ ${name} exists`); return }
  await client.send(new CreateTableCommand({
    TableName: name,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: attrs.map(a => ({ AttributeName: a, AttributeType: 'S' })),
    KeySchema: keySchema,
    ...(gsis ? { GlobalSecondaryIndexes: gsis.map(g => ({
      IndexName: g.name,
      KeySchema: [{ AttributeName: g.key, KeyType: 'HASH' }],
      Projection: { ProjectionType: 'ALL' },
    })) } : {}),
  }))
  console.log(`✅ Created ${name}`)
}

await create(
  'plexora-newsletter-subscribers',
  [{ AttributeName: 'tenantId', KeyType: 'HASH' }, { AttributeName: 'email', KeyType: 'RANGE' }],
  ['tenantId', 'email', 'confirmToken', 'unsubscribeToken'],
  [{ name: 'confirmToken-index', key: 'confirmToken' }, { name: 'unsubscribeToken-index', key: 'unsubscribeToken' }],
)

await create(
  'plexora-newsletter-templates',
  [{ AttributeName: 'tenantId', KeyType: 'HASH' }, { AttributeName: 'templateId', KeyType: 'RANGE' }],
  ['tenantId', 'templateId'],
)

await create(
  'plexora-newsletter-campaigns',
  [{ AttributeName: 'tenantId', KeyType: 'HASH' }, { AttributeName: 'campaignId', KeyType: 'RANGE' }],
  ['tenantId', 'campaignId'],
)

await create(
  'plexora-newsletter-sends',
  [{ AttributeName: 'campaignId', KeyType: 'HASH' }, { AttributeName: 'subscriberId', KeyType: 'RANGE' }],
  ['campaignId', 'subscriberId', 'trackingToken'],
  [{ name: 'trackingToken-index', key: 'trackingToken' }],
)

await create(
  'plexora-newsletter-automation-rules',
  [{ AttributeName: 'tenantId', KeyType: 'HASH' }, { AttributeName: 'ruleId', KeyType: 'RANGE' }],
  ['tenantId', 'ruleId'],
)

// Leichte Pro-IP/Pro-Email-Drossel für die öffentlichen Signup/Confirm/Unsubscribe-Routen —
// throttleKey z.B. "signup:1.2.3.4" oder "signup:jemand@example.com", TTL räumt sich selbst auf.
if (!(await exists('plexora-newsletter-ratelimit'))) {
  await client.send(new CreateTableCommand({
    TableName: 'plexora-newsletter-ratelimit',
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [{ AttributeName: 'throttleKey', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'throttleKey', KeyType: 'HASH' }],
  }))
  console.log('✅ Created plexora-newsletter-ratelimit')
  await waitActive('plexora-newsletter-ratelimit')
  await client.send(new UpdateTimeToLiveCommand({
    TableName: 'plexora-newsletter-ratelimit',
    TimeToLiveSpecification: { AttributeName: 'ttl', Enabled: true },
  }))
  console.log('✅ TTL enabled on plexora-newsletter-ratelimit')
} else {
  console.log('✓ plexora-newsletter-ratelimit exists')
}

console.log('Done.')
