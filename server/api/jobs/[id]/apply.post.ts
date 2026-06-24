import { PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { Resend } from 'resend'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const campaignId = getRouterParam(event, 'id')
  const body       = await readBody(event)
  const dynamo     = getDynamoClient()

  // Kampagne holen
  const scan = await dynamo.send(new ScanCommand({
    TableName: 'plexora-campaigns',
    FilterExpression: 'campaignId = :id',
    ExpressionAttributeValues: { ':id': campaignId }
  }))
  const campaign = scan.Items?.[0]
  if (!campaign) throw createError({ statusCode: 404, message: 'Stelle nicht gefunden' })

  // Bewerbung speichern
  const application = {
    campaignId,
    applicationId: randomUUID(),
    firstName:  body.firstName,
    lastName:   body.lastName,
    email:      body.email,
    phone:      body.phone || '',
    message:    body.message || '',
    status:     'new',
    created:    new Date().toISOString(),
  }
  await dynamo.send(new PutCommand({ TableName: 'plexora-applications', Item: application }))

  // Branding laden
  let brandName = 'Plexora'
  try {
    const bs = await dynamo.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'branding', scope: 'global' }
    }))
    if (bs.Item?.brandName) brandName = bs.Item.brandName
  } catch {}

  // Mail an Bewerber
  try {
    const resend = new Resend(useRuntimeConfig().resendApiKey as string)
    await resend.emails.send({
      from:    `${brandName} HR <noreply@plexora.eu>`,
      to:      body.email,
      subject: `Bewerbungseingang: ${campaign.title}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#ea580c">${brandName}</h2>
          <p>Hallo ${body.firstName},</p>
          <p>vielen Dank für Ihre Bewerbung als <strong>${campaign.title}</strong>.</p>
          <p>Wir haben Ihre Unterlagen erhalten und melden uns in Kürze bei Ihnen.</p>
          <p style="color:#999;font-size:12px">– Das ${brandName} HR Team</p>
        </div>`,
    })
  } catch (err: any) {
    console.log('Bewerber-Mail Fehler:', err.message)
  }

  return { success: true, applicationId: application.applicationId }
})
