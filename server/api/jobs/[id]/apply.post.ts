import { PutCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

function getSESClient() {
  const config = useRuntimeConfig()
  const accessKey = (config.awsAccessKeyId as string).replace(/^"|"$/g, '')
  const secretKey = (config.awsSecretAccessKey as string).replace(/^"|"$/g, '')
  return new SESClient({
    region: 'eu-central-1',
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey }
  })
}

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

  const ses = getSESClient()
  const fromEmail = 'billing@plexora.eu'

  // Mail an Bewerber
  try {
    await ses.send(new SendEmailCommand({
      Source: `${brandName} HR <${fromEmail}>`,
      Destination: { ToAddresses: [body.email] },
      Message: {
        Subject: { Data: `Bewerbungseingang: ${campaign.title}` },
        Body: {
          Html: {
            Data: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                <h2 style="color:#7C3AED">${brandName}</h2>
                <p>Hallo ${body.firstName},</p>
                <p>vielen Dank für Ihre Bewerbung als <strong>${campaign.title}</strong>.</p>
                <p>Wir haben Ihre Unterlagen erhalten und melden uns in Kürze bei Ihnen.</p>
                <p style="color:#999;font-size:12px">– Das ${brandName} HR Team</p>
              </div>
            `
          }
        }
      }
    }))
  } catch (err: any) {
    console.log('Bewerber-Mail Fehler:', err.message)
  }

  return { success: true, applicationId: application.applicationId }
})
