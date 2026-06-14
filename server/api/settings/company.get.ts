import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULTS = {
  legalName: '',
  representedBy: '',
  street: '',
  zipCity: '',
  country: 'Deutschland',
  email: '',
  phone: '',
  vatId: '',
  register: '',
  registerCourt: '',
}

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'company', scope: 'global' }
    }))
    return { company: { ...DEFAULTS, ...result.Item } }
  } catch {
    return { company: DEFAULTS }
  }
})
