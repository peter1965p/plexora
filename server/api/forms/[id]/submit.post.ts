import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { randomUUID } from 'crypto'

export default defineEventHandler(async (event) => {
  const formId = getRouterParam(event, 'id')
  const body   = await readBody(event)
  const query  = getQuery(event)
  const client = getDynamoClient()

  const { Item: form } = await client.send(new GetCommand({
    TableName: 'plexora-forms',
    Key: { formId }
  }))

  if (!form) throw createError({ statusCode: 404, message: 'Form not found' })

  const submissionId = randomUUID()

  await client.send(new PutCommand({
    TableName: 'plexora-submissions',
    Item: {
      submissionId,
      formId,
      formTitle: form.title,
      data:      body.data || {},
      utmSource:   query.utm_source   || body.utmSource   || '',
      utmMedium:   query.utm_medium   || body.utmMedium   || '',
      utmCampaign: query.utm_campaign || body.utmCampaign || '',
      created:   new Date().toISOString(),
    }
  }))

  // ── Auto-Lead: Kontakt anlegen wenn E-Mail vorhanden ──
  const data = body.data || {}
  const emailKey = Object.keys(data).find(k =>
    k.toLowerCase().includes('mail') || k.toLowerCase().includes('e-mail')
  )
  const firstNameKey = Object.keys(data).find(k =>
    k.toLowerCase().includes('vorname') || k.toLowerCase().includes('first')
  )
  const lastNameKey = Object.keys(data).find(k =>
    k.toLowerCase().includes('nachname') || k.toLowerCase().includes('last') || k.toLowerCase().includes('name')
  )
  const phoneKey = Object.keys(data).find(k =>
    k.toLowerCase().includes('telefon') || k.toLowerCase().includes('phone') || k.toLowerCase().includes('tel')
  )

  if (emailKey && data[emailKey]) {
    const firstName = firstNameKey ? data[firstNameKey] : ''
    const lastName  = lastNameKey  ? data[lastNameKey]  : (form.title || 'Lead')
    const phone     = phoneKey     ? data[phoneKey]     : ''

    await client.send(new PutCommand({
      TableName: 'plexora-contacts',
      Item: {
        userId:        'demo-user',
        contactId:     randomUUID(),
        firstName,
        lastName,
        email:         data[emailKey],
        company:       data['Firma'] || data['Unternehmen'] || data['Company'] || '',
        companyId:     '',
        phone,
        status:        'lead',
        leadSource:    'landingpage',
        leadStatus:    'new',
        utmSource:     String(query.utm_source   || body.utmSource   || ''),
        utmMedium:     String(query.utm_medium   || body.utmMedium   || ''),
        utmCampaign:   String(query.utm_campaign || body.utmCampaign || form.title || ''),
        utmContent:    String(query.utm_content  || body.utmContent  || ''),
        utmTerm:       String(query.utm_term     || body.utmTerm     || ''),
        landingPageId: formId,
        score:         0,
        customerId:    '',
        convertedAt:   '',
        accessCount:   0,
        lastAccessedAt: '',
        notes:         `Auto-Lead via Formular "${form.title}" (Submission: ${submissionId})`,
        created:       new Date().toISOString(),
      }
    }))
  }

  return { success: true, message: form.successMsg }
})
