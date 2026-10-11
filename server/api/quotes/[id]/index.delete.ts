import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { assertNotDemo } from '../../../utils/demoPolicy'
import { requireAuth } from '../../../utils/verifyAuth'
import { loadOwnedQuote, QUOTES_TABLE } from '../../../utils/quoteStore'
import { effectiveStatus } from '../../../../shared/quotes'

// Löschen: Entwürfe, abgelehnte und abgelaufene. Gesendete (offene) und angenommene Angebote bleiben als Beleg.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang können keine Angebote gelöscht werden.')      // Demo zuerst: 403, nie ein 404 über fremde Daten
  const { tenantId, quote } = await loadOwnedQuote(event)
  if (!['draft', 'declined', 'expired'].includes(effectiveStatus(quote))) throw createError({ statusCode: 409, message: 'Gesendete und angenommene Angebote lassen sich nicht löschen.' })
  await getDynamoClient().send(new DeleteCommand({ TableName: QUOTES_TABLE, Key: { userId: tenantId, quoteId: quote.quoteId } }))
  return { success: true }
})
