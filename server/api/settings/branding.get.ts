import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = {
  brandName:    'Plexora',
  brandTagline: 'Business Platform',
  primaryColor: '#ea580c',
  portalTitle:  'Kundenportal',
}

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'branding', scope: 'global' }
    }))
    return { branding: result.Item || DEFAULTS }
  } catch {
    return { branding: DEFAULTS }
  }
})
