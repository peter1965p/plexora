import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { pick, BRANDING_ROW_FIELDS } from '../../utils/publicView'

const DEFAULTS = {
  brandName:    'Plexora',
  brandTagline: 'Business Platform',
  primaryColor: '#ea580c',
  portalTitle:  'Kundenportal',
}

export default defineEventHandler(async (event) => {
  const client = getDynamoClient()
  const email = event.context.auth?.email
  const scope = email ? await resolveUserId(email) : 'global'
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'branding', scope }
    }))
    return { branding: result.Item ? pick(result.Item, BRANDING_ROW_FIELDS) : DEFAULTS }
  } catch {
    return { branding: DEFAULTS }
  }
})
