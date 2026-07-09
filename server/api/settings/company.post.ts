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
      settingId:     'company',
      scope,
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
      iban:          body.iban          || '',
      bic:           body.bic           || '',
      bankName:      body.bankName      || '',
      paymentNote:   body.paymentNote   || '',
      updated:       new Date().toISOString(),
    }
  }))
  return { success: true }
})
