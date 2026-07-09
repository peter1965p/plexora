import { demoGuard } from '../../utils/demoGuard'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  demoGuard(body?.userId)
  const client = getDynamoClient()
  const scope = await resolveUserId(event.context.auth?.email || 'demo-user')

  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:    'branding',
      scope,
      brandName:    body.brandName    || 'Plexora',
      brandTagline: body.brandTagline || 'Business Platform',
      primaryColor: body.primaryColor || '#ea580c',
      portalTitle:  body.portalTitle  || 'Kundenportal',
      logoUrl:      body.logoUrl      || '',
      updated:      new Date().toISOString(),
    }
  }))

  return { success: true }
})
