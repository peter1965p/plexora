import { demoGuard } from '../../utils/demoGuard'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { demoGuard } from '../../utils/demoGuard'
import { getDynamoClient } from '../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  demoGuard(body?.userId)
  const client = getDynamoClient()
  await client.send(new PutCommand({
    TableName: 'plexora-settings',
    Item: {
      settingId:     'company',
      scope:         'global',
      legalName:     body.legalName     || '',
      representedBy: body.representedBy || '',
      street:        body.street        || '',
      zipCity:       body.zipCity       || '',
      country:       body.country       || 'Deutschland',
      email:         body.email         || '',
      phone:         body.phone         || '',
      vatId:         body.vatId         || '',
      register:      body.register      || '',
      registerCourt: body.registerCourt || '',
      updated:       new Date().toISOString(),
    }
  }))
  return { success: true }
})
