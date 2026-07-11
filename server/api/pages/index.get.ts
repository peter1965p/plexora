import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

// Bewusst weiterhin unauthentifiziert: diese Liste speist die Navigation der
// öffentlichen Marketing-Seiten (index.vue, p/[slug].vue) — Impressum/Datenschutz/
// AGB sind absichtlich öffentlicher Inhalt, kein privates Tenant-Datenleck wie bei
// Rechnungen/Dokumenten. Ein requireAuth()-Fix hier würde die Live-Navigation kappen.
export default defineEventHandler(async () => {
  const client = getDynamoClient()
  const { Items } = await client.send(new ScanCommand({ TableName: 'plexora-pages' }))
  return { pages: Items || [] }
})
