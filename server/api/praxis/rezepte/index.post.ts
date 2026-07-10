import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { requireTenantId } from '../../../utils/auth'
import { randomUUID } from 'crypto'

// Bewusst nur eine interne Freitext-Notiz + PDF — keine strukturierte eRezept-/
// Apotheken-Anbindung (regulatorisch außerhalb des Rahmens dieses Moduls).
export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body = await readBody(event)
  const dynamo = getDynamoClient()
  const rezeptId = randomUUID()
  const now = new Date().toISOString()
  const item = {
    tenantId,
    rezeptId,
    patientId: body.patientId || '',
    text:      body.text || '',
    issuedAt:  now,
    createdAt: now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-praxis-rezepte', Item: item }))
  return { rezept: item }
})
