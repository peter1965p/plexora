import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../../utils/dynamodb'
import { assertNotDemo } from '../../../../../utils/demoPolicy'
import { requireAuth } from '../../../../../utils/verifyAuth'
import { enforcePublicRateLimit } from '../../../../../utils/rateLimit'
import { fewoContext, loadUnit, addFeed, syncFeed, unitView, UNITS_TABLE } from '../../../../../utils/fewoStore'
import { LIMITS } from '../../../../../../shared/fewo'

// Kanal-Kalender (iCal-Adresse von Booking.com, Airbnb, Vrbo ...) hinzufügen und gleich einmal einlesen.
export default defineEventHandler(async (event) => {
  assertNotDemo(requireAuth(event), 'Im Demo-Zugang nicht möglich.')
  const { tenantId } = await fewoContext(event)
  await enforcePublicRateLimit(event, 'fewo-feed')    // jede Anfrage ruft eine fremde Adresse auf
  const unit = await loadUnit(tenantId, String(getRouterParam(event, 'id') || ''))
  const body: any = await readBody(event).catch(() => ({}))
  const name = String(body?.name || '').trim().slice(0, 60), url = String(body?.url || '').trim().slice(0, 2000)
  if (!name || !url) throw createError({ statusCode: 400, message: 'Bitte Name und Kalender-Adresse angeben.' })
  if ((unit.feeds || []).length >= LIMITS.feeds) throw createError({ statusCode: 400, message: `Höchstens ${LIMITS.feeds} Kanäle je Unterkunft.` })
  let feed
  try { feed = await addFeed(unit, name, url) } catch (e: any) { throw createError({ statusCode: 400, message: e.message }) }
  let result: any = null
  try { result = await syncFeed(tenantId, unit, feed); Object.assign(feed, { lastSyncAt: new Date().toISOString(), lastStatus: 'ok', count: result.added }) }
  catch (e: any) { throw createError({ statusCode: 422, message: `Der Kalender konnte nicht gelesen werden: ${e.message}` }) }
  const next = { ...unit, feeds: [...(unit.feeds || []), feed], updated: new Date().toISOString() }
  await getDynamoClient().send(new PutCommand({ TableName: UNITS_TABLE, Item: next }))
  return { success: true, unit: unitView(next), result }
})
