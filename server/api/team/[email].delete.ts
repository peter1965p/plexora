import { DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId, invalidateTenantCache } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const memberEmail  = decodeURIComponent(getRouterParam(event, 'email') || '')
  const requesterEmail = event.context.auth?.email || ''

  if (!memberEmail || !requesterEmail) throw createError({ statusCode: 400, message: 'Parameter fehlen' })

  const tenantId = await resolveUserId(requesterEmail)

  // Nur Admin (= tenantId === requesterEmail) darf entfernen
  if (tenantId !== requesterEmail) throw createError({ statusCode: 403, message: 'Nur Admins können Mitglieder entfernen' })
  if (memberEmail === requesterEmail) throw createError({ statusCode: 400, message: 'Du kannst dich nicht selbst entfernen' })

  await getDynamoClient().send(new DeleteCommand({
    TableName: 'plexora-team-members',
    Key: { tenantId, memberEmail },
  }))

  invalidateTenantCache(memberEmail)
  return { success: true }
})
