import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { generateEmailContent, buildEmailHtml } from '../../../utils/marketingEmail'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { userId, subject, tone = 'freundlich', contactFilter = {} } = body || {}

  const config = useRuntimeConfig()
  const dynamo = getDynamoClient()

  const campaignRes = await dynamo.send(new QueryCommand({
    TableName: 'plexora-marketing',
    KeyConditionExpression: 'userId = :uid AND campaignId = :cid',
    ExpressionAttributeValues: { ':uid': userId, ':cid': campaignId },
  }))
  const campaign = campaignRes.Items?.[0]
  if (!campaign) throw createError({ statusCode: 404, message: 'Kampagne nicht gefunden' })

  let contacts = (await dynamo.send(new QueryCommand({
    TableName: 'plexora-contacts',
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
  }))).Items || []

  if (contactFilter.status) contacts = contacts.filter((c: any) => c.status === contactFilter.status)
  contacts = contacts.filter((c: any) => c.email)

  const contact = contacts[0]
  if (!contact) return { available: false, message: 'Kein passender Kontakt für dieses Segment gefunden' }

  const firstName = contact.firstName || ''
  const contactName = `${firstName} ${contact.lastName || ''}`.trim()

  const emailBody = await generateEmailContent({
    apiKey: config.anthropicApiKey as string,
    campaignTopic: campaign.headline || campaign.name,
    contactName,
    contactCompany: contact.company || '',
    tone,
  })

  const emailSubject = subject || `${campaign.name}${campaign.headline ? ' — ' + campaign.headline : ''}`
  const accent = campaign.accentColor || '#6C3FE8'

  return {
    available: true,
    to: contact.email,
    contactName,
    subject: emailSubject,
    html: buildEmailHtml({ contactName, firstName, emailBody, accent, campaignName: campaign.name }),
  }
})
