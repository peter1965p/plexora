import { DynamoDBClient, ListTablesCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb'

export default defineEventHandler(async () => {
  const client = new DynamoDBClient({ region: 'eu-central-1' })

  const { TableNames } = await client.send(new ListTablesCommand({}))

  const tables = await Promise.all(
    (TableNames || []).map(async (name) => {
      const { Table } = await client.send(new DescribeTableCommand({ TableName: name }))
      return {
        name,
        itemCount: Table?.ItemCount || 0,
        sizeBytes: Table?.TableSizeBytes || 0,
        status: Table?.TableStatus,
        billingMode: Table?.BillingModeSummary?.BillingMode || 'PROVISIONED',
      }
    })
  )

  return { tables }
})
