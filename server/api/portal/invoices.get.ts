import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  // TODO: userId aus JWT holen für Produktion
  // Vorerst alle Rechnungen — später nach customerId filtern
  const client = getDynamoClient()
  const result = await client.send(new ScanCommand({ TableName: 'plexora-finance' }))
  return { invoices: result.Items || [] }
})
