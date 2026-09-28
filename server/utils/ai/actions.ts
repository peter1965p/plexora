import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../dynamodb'
import { resolveUserId } from '../tenant'
import { randomUUID } from 'crypto'

// Aktionen, die Plexi über Function-Calling vorschlagen kann. Ausführung passiert
// NIE direkt aus dem Chat-Aufruf heraus — immer erst nach expliziter Bestätigung
// durch den Nutzer über /api/ai/assistant/execute. Die Schreiblogik hier spiegelt
// exakt die bestehenden Routen (server/api/finance, server/api/contacts), damit
// eine per Plexi angelegte Rechnung/Kontakt sich nicht anders verhält als eine
// manuell angelegte.

export interface ActionDef {
  name: string
  label: string
  description: string
  parameters: Record<string, any>
}

export const ACTIONS: Record<string, ActionDef> = {
  create_invoice: {
    name: 'create_invoice',
    label: 'Rechnung erstellen',
    description: 'Legt eine neue Rechnung für einen Kunden an. Wird erst nach Bestätigung durch den Nutzer wirklich gespeichert.',
    parameters: {
      type: 'object',
      properties: {
        client: { type: 'string', description: 'Name des Kunden oder der Firma' },
        clientEmail: { type: 'string', description: 'E-Mail-Adresse des Kunden (optional)' },
        items: {
          type: 'array',
          description: 'Rechnungspositionen',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              qty: { type: 'number', description: 'Menge, Standard 1' },
              price: { type: 'number', description: 'Einzelpreis in Euro, netto' },
            },
            required: ['description', 'price'],
          },
        },
        dueDate: { type: 'string', description: 'Fälligkeitsdatum im Format YYYY-MM-DD (optional)' },
      },
      required: ['client', 'items'],
    },
  },
  create_contact: {
    name: 'create_contact',
    label: 'Kontakt anlegen',
    description: 'Legt einen neuen Kontakt/Lead im CRM an. Wird erst nach Bestätigung durch den Nutzer wirklich gespeichert.',
    parameters: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        company: { type: 'string', description: 'Firmenname (optional)' },
        phone: { type: 'string', description: 'Telefonnummer (optional)' },
        status: { type: 'string', enum: ['lead', 'customer'], description: 'Standard: lead' },
      },
      required: ['firstName', 'lastName', 'email'],
    },
  },
}

export async function executeAction(name: string, args: any, email: string): Promise<{ message: string }> {
  const dynamo = getDynamoClient()

  if (name === 'create_invoice') {
    const client = String(args?.client || '').trim()
    if (!client) throw new Error('Kunde (client) fehlt')
    const itemsIn = Array.isArray(args?.items) ? args.items : []
    if (!itemsIn.length) throw new Error('Mindestens eine Position (items) erforderlich')
    const items = itemsIn.map((i: any) => ({
      description: String(i?.description || 'Dienstleistung'),
      qty: Number(i?.qty) || 1,
      price: Number(i?.price) || 0,
    }))
    const amount = items.reduce((sum: number, i: any) => sum + i.qty * i.price, 0)
    const invoice = {
      userId: await resolveUserId(email),
      invoiceId: randomUUID(),
      number: 'INV-' + Date.now(),
      client,
      clientEmail: String(args?.clientEmail || ''),
      description: items[0]?.description || '',
      amount,
      items,
      status: 'pending',
      dueDate: args?.dueDate || '',
      mailSent: false,
      created: new Date().toISOString(),
    }
    await dynamo.send(new PutCommand({ TableName: 'plexora-finance', Item: invoice }))
    return { message: `Rechnung ${invoice.number} über ${amount.toFixed(2)}€ für ${client} wurde erstellt.` }
  }

  if (name === 'create_contact') {
    const firstName = String(args?.firstName || '').trim()
    const lastName = String(args?.lastName || '').trim()
    const email_ = String(args?.email || '').trim()
    if (!firstName || !lastName || !email_) throw new Error('firstName, lastName und email sind Pflicht')
    const contact = {
      userId: await resolveUserId(email),
      contactId: randomUUID(),
      firstName, lastName, email: email_,
      company: String(args?.company || ''),
      companyId: '',
      phone: String(args?.phone || ''),
      status: args?.status === 'customer' ? 'customer' : 'lead',
      leadSource: 'plexi', leadStatus: 'new',
      utmSource: '', utmMedium: '', utmCampaign: '', utmContent: '', utmTerm: '', landingPageId: '',
      score: 0, customerId: '', convertedAt: '', accessCount: 0, lastAccessedAt: '',
      created: new Date().toISOString(),
    }
    await dynamo.send(new PutCommand({ TableName: 'plexora-contacts', Item: contact }))
    return { message: `Kontakt ${firstName} ${lastName} wurde angelegt.` }
  }

  throw new Error(`Unbekannte Aktion "${name}"`)
}
