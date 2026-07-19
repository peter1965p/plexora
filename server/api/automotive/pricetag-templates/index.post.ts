import { requireTenantId } from '../../../utils/auth'
import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const tenantId = await requireTenantId(event)
  const body     = await readBody(event)
  const dynamo   = getDynamoClient()

  const name = String(body.name || '').trim()
  const contentHtml = String(body.contentHtml ?? '')
  if (!name) throw createError({ statusCode: 400, message: 'Name erforderlich' })

  const now = new Date().toISOString()
  const item = {
    tenantId,
    templateId:  randomUUID(),
    name,
    presetKey:   body.presetKey || 'klassisch',
    contentHtml,
    pageFormat:  body.pageFormat  || 'A5',
    orientation: body.orientation || 'portrait',
    createdAt:   now,
    updatedAt:   now,
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-pricetag-templates', Item: item }))
  return { template: item }
})
