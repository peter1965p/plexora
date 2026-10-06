import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { requireAuth } from '../../utils/verifyAuth'
import { assertNotDemo } from '../../utils/demoPolicy'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  assertNotDemo(requireAuth(event))
  const client = getDynamoClient()
  const scope = await resolveUserId(requireAuth(event).email)

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
