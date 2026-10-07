import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'

// Mengenbegrenzung für Konten ohne Lizenz (Free): CRM bis 50 Datensätze insgesamt (Kontakte + Firmen + Deals), Projekte und Support je bis 25.
// Geprüft wird beim ANLEGEN (POST auf die Listen-Route), siehe server/middleware/plan.ts. Bestehende Daten bleiben les- und änderbar.
export type RecordArea = 'crm' | 'projects' | 'support'
export const RECORD_ROUTES: Record<string, { area: RecordArea; label: string; tables: string[] }> = {
  '/api/contacts':  { area: 'crm',      label: 'CRM-Einträge (Kontakte, Firmen, Deals)', tables: ['plexora-contacts', 'plexora-companies', 'plexora-deals'] },
  '/api/companies': { area: 'crm',      label: 'CRM-Einträge (Kontakte, Firmen, Deals)', tables: ['plexora-contacts', 'plexora-companies', 'plexora-deals'] },
  '/api/deals':     { area: 'crm',      label: 'CRM-Einträge (Kontakte, Firmen, Deals)', tables: ['plexora-contacts', 'plexora-companies', 'plexora-deals'] },
  '/api/projects':  { area: 'projects', label: 'Projekte', tables: ['plexora-projects'] },
  '/api/support':   { area: 'support',  label: 'Support-Tickets', tables: ['plexora-support'] },
}

export async function countRecords(tenantId: string, tables: string[]): Promise<number> {
  const db = getDynamoClient()
  let total = 0
  for (const TableName of tables) {
    let start: Record<string, any> | undefined
    do {
      const r = await db.send(new QueryCommand({ TableName, KeyConditionExpression: 'userId = :u', ExpressionAttributeValues: { ':u': tenantId }, Select: 'COUNT', ExclusiveStartKey: start }))
      total += r.Count || 0; start = r.LastEvaluatedKey
    } while (start)
  }
  return total
}
