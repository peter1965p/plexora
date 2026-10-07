import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'

// Bewusst weiterhin ohne Anmeldung: diese Liste speist die Navigation der öffentlichen Marketing-Seiten (index.vue, p/[slug].vue).
// Anonym kommen nur VERÖFFENTLICHTE Seiten heraus. Der angemeldete Besitzer sieht zusätzlich seine eigenen Entwürfe (Navigationsverwaltung
// in den Einstellungen). Das Feld userId (E-Mail des Besitzers) verlässt den Server nie. "blocks" bleibt drin, weil die Navigationsverwaltung
// die Seiten mit PUT zurückschreibt.
export default defineEventHandler(async (event) => {
  const client = getDynamoClient()
  const { Items } = await client.send(new ScanCommand({ TableName: 'plexora-pages' }))
  const email = event.context.auth?.email
  const owner = email ? await resolveUserId(email) : ''
  const pages = (Items || [])
    .filter((p: any) => p.status === 'published' || (owner && p.userId === owner))
    .map(({ userId: _owner, ...publicPage }: any) => publicPage)
  return { pages }
})
