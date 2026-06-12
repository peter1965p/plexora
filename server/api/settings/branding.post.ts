import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body   = await readBody(event)
  const client = getDynamoClient()
  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:    'branding',
      scope:        'global',
      brandName:    body.brandName    || 'Plexora',
      brandTagline: body.brandTagline || 'Business Platform',
      primaryColor: body.primaryColor || '#7C3AED',
      portalTitle:  body.portalTitle  || 'Kundenportal',
      updated:      new Date().toISOString(),
    }
  }))
  return { success: true }
})
