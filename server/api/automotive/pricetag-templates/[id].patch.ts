import { requireTenantId } from '../../../utils/auth'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const tenantId   = await requireTenantId(event)
  const templateId = getRouterParam(event, 'id') || ''
  const body       = await readBody(event)
  const dynamo     = getDynamoClient()

  const name = String(body.name || '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name erforderlich' })

  try {
    await dynamo.send(new UpdateCommand({
      TableName: 'plexora-pricetag-templates',
      Key: { tenantId, templateId },
      ConditionExpression: 'attribute_exists(tenantId)',
      UpdateExpression: 'SET #n = :n, presetKey = :p, contentHtml = :c, pageFormat = :pf, orientation = :o, updatedAt = :u',
      ExpressionAttributeNames: { '#n': 'name' },
      ExpressionAttributeValues: {
        ':n':  name,
        ':p':  body.presetKey   || 'klassisch',
        ':c':  String(body.contentHtml ?? ''),
        ':pf': body.pageFormat  || 'A5',
        ':o':  body.orientation || 'portrait',
        ':u':  new Date().toISOString(),
      },
    }))
  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') throw createError({ statusCode: 404, message: 'Vorlage nicht gefunden' })
    throw err
  }

  return { success: true }
})
