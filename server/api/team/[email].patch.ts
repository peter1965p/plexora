import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId, invalidateTenantCache } from '../../utils/tenant'
import { requireAuth } from '../../utils/verifyAuth'
import { isDemoAccount } from '../../utils/mailGuard'
import { invalidateRoleCache } from '../../utils/teamRole'
import { invalidatePlanCache } from '../../utils/tenantPlan'

// Rolle eines Team-Mitglieds ändern (nur der Inhaber; Werte nur "admin" oder "member"). Wirkt sofort (Zwischenspeicher wird geleert).
export default defineEventHandler(async (event) => {
  const memberEmail = decodeURIComponent(getRouterParam(event, 'email') || '').trim()
  const auth = requireAuth(event)
  const me = auth.email || ''
  if (isDemoAccount(auth)) throw createError({ statusCode: 403, message: 'Im Demo-Zugang können keine Rollen geändert werden.' })
  const body: any = await readBody(event).catch(() => ({}))
  const role = body?.role
  if (role !== 'admin' && role !== 'member') throw createError({ statusCode: 400, message: 'Die Rolle muss „admin“ oder „member“ sein.' })
  if (!memberEmail || !me) throw createError({ statusCode: 400, message: 'Parameter fehlen' })
  const tenantId = await resolveUserId(me)
  if (tenantId.toLowerCase() !== me.toLowerCase()) throw createError({ statusCode: 403, message: 'Nur der Inhaber kann Rollen ändern.' })
  if (memberEmail.toLowerCase() === me.toLowerCase()) throw createError({ statusCode: 400, message: 'Du kannst deine eigene Rolle nicht ändern.' })

  const db = getDynamoClient()
  const row = (await db.send(new GetCommand({ TableName: 'plexora-team-members', Key: { tenantId, memberEmail } }))).Item
  if (!row) throw createError({ statusCode: 404, message: 'Mitglied nicht gefunden' })
  await db.send(new UpdateCommand({
    TableName: 'plexora-team-members', Key: { tenantId, memberEmail },
    UpdateExpression: 'SET #r = :r', ConditionExpression: 'attribute_exists(tenantId)',
    ExpressionAttributeNames: { '#r': 'role' }, ExpressionAttributeValues: { ':r': role },
  }))
  invalidateRoleCache(memberEmail); invalidateTenantCache(memberEmail); invalidatePlanCache()
  return { success: true, role }
})
