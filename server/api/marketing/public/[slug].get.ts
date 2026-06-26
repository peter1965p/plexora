import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'

export default defineEventHandler(async (event) => {
  const slug   = getRouterParam(event, 'slug') as string
  const client = getDynamoClient()

  // Erst nach campaignId, dann slug, dann formId suchen
  const res = await client.send(new ScanCommand({
    TableName: 'plexora-marketing',
    FilterExpression: 'campaignId = :s OR slug = :s OR formId = :s',
    ExpressionAttributeValues: { ':s': slug },
  }))

  // Wenn mehrere Treffer: campaignId-Treffer bevorzugen, dann slug
  const items = res.Items || []
  const campaign =
    items.find(i => i.campaignId === slug) ||
    items.find(i => i.slug === slug) ||
    items[0] ||
    null

  if (!campaign) return { campaign: null, form: null }

  // Formular direkt mitholen
  let form = null
  if (campaign.formId) {
    try {
      const formRes = await client.send(new ScanCommand({
        TableName: 'plexora-forms',
        FilterExpression: 'formId = :fid',
        ExpressionAttributeValues: { ':fid': campaign.formId },
      }))
      form = formRes.Items?.[0] || null
      if (form?.fields && typeof form.fields === 'string') {
        try { form.fields = JSON.parse(form.fields) } catch {}
      }
    } catch {}
  }

  return { campaign, form }
})
