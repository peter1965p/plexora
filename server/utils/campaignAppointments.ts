import { PutCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { getDynamoClient } from './dynamodb'
import { getTenantByEmail } from './ai/keys'

const DEFAULT_LIFETIME_DAYS = 90

// Standard-Ablauf, falls beim Anlegen kein Datum gewählt wurde
export function defaultCampaignEnd(): string {
  return new Date(Date.now() + DEFAULT_LIFETIME_DAYS * 86400_000).toISOString()
}

// Legt eine Terminart an, die nur über den Kampagnen-Link erreichbar ist (campaignId gesetzt)
export async function createCampaignAppointmentType(userId: string, campaign: { campaignId: string; name: string; durationMinutes?: number }): Promise<string | null> {
  const tenant = await getTenantByEmail(userId)
  if (!tenant?.tenantId) return null
  const typeId = randomUUID()
  const now = new Date().toISOString()
  await getDynamoClient().send(new PutCommand({
    TableName: 'plexora-termine-types',
    Item: {
      tenantId: tenant.tenantId,
      typeId,
      name: campaign.name || 'Kampagnen-Termin',
      durationMinutes: Number(campaign.durationMinutes) || 30,
      active: true,
      campaignId: campaign.campaignId,
      createdAt: now,
      updatedAt: now,
    },
  }))
  return typeId
}

async function deleteCampaignAppointmentType(userId: string, typeId: string) {
  if (!typeId) return
  const tenant = await getTenantByEmail(userId)
  if (!tenant?.tenantId) return
  await getDynamoClient().send(new DeleteCommand({
    TableName: 'plexora-termine-types',
    Key: { tenantId: tenant.tenantId, typeId },
  }))
}

// Terminart der Kampagne, die zu einem Formular gehört (für die Buchungsmail)
export async function findCampaignAppointmentTypeId(userId: string, formId: string): Promise<string> {
  if (!formId) return ''
  const res = await getDynamoClient().send(new QueryCommand({
    TableName: 'plexora-marketing',
    KeyConditionExpression: 'userId = :u',
    FilterExpression: 'formId = :f AND attribute_exists(appointmentTypeId)',
    ExpressionAttributeValues: { ':u': userId, ':f': formId },
  }))
  return (res.Items?.[0]?.appointmentTypeId as string) || ''
}

// Entfernt Kampagne und Terminart, wenn der Ablauf erreicht ist
export async function deleteExpiredCampaigns(): Promise<number> {
  const dynamo = getDynamoClient()
  const now = new Date().toISOString()
  const res = await dynamo.send(new ScanCommand({
    TableName: 'plexora-marketing',
    FilterExpression: 'attribute_exists(endsAt) AND endsAt <= :now',
    ExpressionAttributeValues: { ':now': now },
  }))
  let removed = 0
  for (const c of res.Items || []) {
    try {
      await deleteCampaignAppointmentType(c.userId, c.appointmentTypeId)
      await dynamo.send(new DeleteCommand({
        TableName: 'plexora-marketing',
        Key: { userId: c.userId, campaignId: c.campaignId },
      }))
      removed++
    } catch (e) {
      console.error('Abgelaufene Kampagne konnte nicht entfernt werden', c.campaignId, e)
    }
  }
  return removed
}

export { deleteCampaignAppointmentType }
