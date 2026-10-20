// Trägt die Pakete des Branchen-Baukastens (shared/branchKit.ts) im Modul-Store ein (Tabelle plexora-plugin-registry). Bereits vorhandene Einträge werden aktualisiert.
// Aufruf: npx vite-node scripts/register-branch-kit.mjs [--apply]   (ohne --apply nur anzeigen)
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { KIT_PACKAGES, KIT_ROUTE } from '../shared/branchKit'

const apply = process.argv.includes('--apply')
const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-central-1' }))
for (const p of KIT_PACKAGES) {
  const item = { key: p.key, name: p.name, icon: p.icon, price: p.price, desc: p.desc, features: p.features, builtin: true, route: KIT_ROUTE(p.key) }
  console.log(apply ? 'schreibe' : 'würde schreiben', JSON.stringify(item))
  if (apply) await db.send(new PutCommand({ TableName: 'plexora-plugin-registry', Item: item }))
}
