import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { assertOwner } from '../../utils/ownership'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const client     = getDynamoClient()

  const scan = await client.send(new ScanCommand({
    TableName: 'plexora-marketing',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))

  const campaign = scan.Items?.[0]
  if (!campaign) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })
  await assertOwner(event, campaign)

  let form = null
  if (campaign.formId) {
    const formRes = await client.send(new ScanCommand({
      TableName: 'plexora-forms',
      FilterExpression: 'formId = :fid',
      ExpressionAttributeValues: { ':fid': campaign.formId },
    }))
    form = formRes.Items?.[0] || null
    if (form?.fields && typeof form.fields === 'string') {
      try { form.fields = JSON.parse(form.fields) } catch { form.fields = [] }
    }
  }

  return { campaign, form }
})
