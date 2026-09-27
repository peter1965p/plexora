import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { requireAuth } from '../../utils/verifyAuth'

// Katalog aller verfügbaren Branchen-Module — registry-getrieben statt hartcodiert.
// Ein neues Modul in die Liste aufzunehmen heißt: Datensatz hier anlegen, kein
// Code-Änderung im Store nötig.
export default defineEventHandler(async (event) => {
  requireAuth(event)
  const client = getDynamoClient()
  const result = await client.send(new ScanCommand({ TableName: 'plexora-plugin-registry' }))
  const modules = (result.Items || []).sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''))
  return { modules }
})
