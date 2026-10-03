import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'
import { getDynamoClient } from './dynamodb'

export type NotificationLevel = 'info' | 'warning' | 'error'

export interface SystemNotificationInput {
  userId: string
  type: string
  title: string
  message: string
  level?: NotificationLevel
  link?: string
}

// Zentraler Helfer für Systemnachrichten in der Glocke. Fehler beim Schreiben werden
// verschluckt, damit eine Benachrichtigung nie den eigentlichen Vorgang abbricht.
export async function notifySystem(input: SystemNotificationInput) {
  if (!input.userId || input.userId === 'demo-user') return
  try {
    await getDynamoClient().send(new PutCommand({
      TableName: 'plexora-notifications',
      Item: {
        notificationId: randomUUID(),
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        level: input.level || 'info',
        link: input.link || '',
        read: false,
        created: new Date().toISOString(),
      },
    }))
  } catch {}
}
