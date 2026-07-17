import { ScanCommand, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../utils/dynamodb'
import { sendAutomationEmail } from '../../../utils/newsletterAutomation'

// Täglicher Sweep für verzögerte Automations-Trigger (days-after-signup,
// campaign-reminder). Wird NICHT über Cognito aufgerufen (kein Nutzer im Kontext),
// sondern über einen exakten PUBLIC_PATTERNS-Eintrag in server/middleware/auth.ts
// + diesen Secret-Header-Check hier als zweite Absicherung. on-signup läuft separat
// und sofort im Confirm-Endpunkt (server/api/public/newsletter/confirm/[token].get.ts).
export default defineEventHandler(async (event) => {
  const secret = getHeader(event, 'x-internal-cron-secret')
  if (!secret || secret !== useRuntimeConfig().newsletterCronSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const dynamo = getDynamoClient()
  const results = { daysAfterSignupSent: 0, campaignRemindersSent: 0, rulesProcessed: 0, errors: 0 }

  // Alle aktiven Regeln über alle Tenants hinweg laden — bei der aktuellen
  // Projektgröße ein einmal-täglicher Scan, kein Problem; würde bei sehr vielen
  // Tenants/Regeln später ggf. eine eigene Regel-Liste pro Tenant-Iteration brauchen.
  const rules: any[] = []
  let cursor: Record<string, any> | undefined
  do {
    const page = await dynamo.send(new ScanCommand({
      TableName: 'plexora-newsletter-automation-rules',
      FilterExpression: '#a = :a AND #trig <> :onSignup',
      ExpressionAttributeNames: { '#trig': 'trigger', '#a': 'active' },
      ExpressionAttributeValues: { ':a': true, ':onSignup': 'on-signup' },
      ExclusiveStartKey: cursor,
    }))
    rules.push(...(page.Items || []))
    cursor = page.LastEvaluatedKey
  } while (cursor)

  for (const rule of rules) {
    results.rulesProcessed++
    try {
      if (rule.trigger === 'days-after-signup') {
        results.daysAfterSignupSent += await runDaysAfterSignup(dynamo, rule)
      } else if (rule.trigger === 'campaign-reminder') {
        results.campaignRemindersSent += await runCampaignReminder(dynamo, rule)
      }
    } catch (err) {
      console.error('Automations-Regel fehlgeschlagen:', rule.ruleId, err)
      results.errors++
    }
  }

  return { success: true, ...results }
})

async function runDaysAfterSignup(dynamo: any, rule: any): Promise<number> {
  if (!rule.templateId || !rule.delayDays) return 0
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() - Number(rule.delayDays))
  const datePrefix = targetDate.toISOString().slice(0, 10) // YYYY-MM-DD

  let sent = 0
  let cursor: Record<string, any> | undefined
  do {
    const page = await dynamo.send(new QueryCommand({
      TableName: 'plexora-newsletter-subscribers',
      KeyConditionExpression: 'tenantId = :t',
      FilterExpression: '#s = :confirmed AND begins_with(confirmedAt, :d)',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':t': rule.tenantId, ':confirmed': 'confirmed', ':d': datePrefix },
      ExclusiveStartKey: cursor,
    }))
    for (const sub of page.Items || []) {
      const already = Array.isArray(sub.automationsSent) && sub.automationsSent.includes(rule.ruleId)
      if (already) continue
      const ok = await sendAutomationEmail(rule.tenantId, sub, rule.templateId)
      if (ok) {
        await dynamo.send(new UpdateCommand({
          TableName: 'plexora-newsletter-subscribers',
          Key: { tenantId: sub.tenantId, email: sub.email },
          UpdateExpression: 'SET automationsSent = list_append(if_not_exists(automationsSent, :empty), :rid)',
          ExpressionAttributeValues: { ':rid': [rule.ruleId], ':empty': [] },
        })).catch(() => {})
        sent++
      }
    }
    cursor = page.LastEvaluatedKey
  } while (cursor)

  return sent
}

async function runCampaignReminder(dynamo: any, rule: any): Promise<number> {
  if (!rule.campaignId || !rule.templateId || !rule.delayDays) return 0

  const campaignRes = await dynamo.send(new GetCommand({
    TableName: 'plexora-newsletter-campaigns',
    Key: { tenantId: rule.tenantId, campaignId: rule.campaignId },
  }))
  const campaign = campaignRes.Item
  if (!campaign || campaign.status !== 'sent' || !campaign.sentAt) return 0

  const dueAt = new Date(campaign.sentAt)
  dueAt.setDate(dueAt.getDate() + Number(rule.delayDays))
  if (Date.now() < dueAt.getTime()) return 0

  let sent = 0
  let cursor: Record<string, any> | undefined
  do {
    const page = await dynamo.send(new QueryCommand({
      TableName: 'plexora-newsletter-sends',
      KeyConditionExpression: 'campaignId = :c',
      FilterExpression: 'attribute_not_exists(openedAt) AND attribute_not_exists(reminderSent) AND #s = :sentStatus',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':c': rule.campaignId, ':sentStatus': 'sent' },
      ExclusiveStartKey: cursor,
    }))
    for (const send of page.Items || []) {
      const subRes = await dynamo.send(new GetCommand({
        TableName: 'plexora-newsletter-subscribers',
        Key: { tenantId: send.tenantId, email: send.email },
      }))
      const subscriber = subRes.Item
      if (!subscriber || subscriber.status !== 'confirmed') continue

      const ok = await sendAutomationEmail(rule.tenantId, subscriber, rule.templateId)
      if (ok) {
        await dynamo.send(new UpdateCommand({
          TableName: 'plexora-newsletter-sends',
          Key: { campaignId: send.campaignId, subscriberId: send.subscriberId },
          UpdateExpression: 'SET reminderSent = :now',
          ExpressionAttributeValues: { ':now': new Date().toISOString() },
        })).catch(() => {})
        sent++
      }
    }
    cursor = page.LastEvaluatedKey
  } while (cursor)

  return sent
}
