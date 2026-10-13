import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { parseLandingTheme } from '../../../shared/landingTheme'

// Design der öffentlichen Plexora-Startseite (global, es gibt nur eine Marketingseite). Ohne gespeicherte Auswahl: das freundliche helle Standarddesign.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  try {
    const res = await getDynamoClient().send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'landing-theme', scope: 'global' } }))
    return { theme: parseLandingTheme(res.Item?.theme) }
  } catch {
    return { theme: parseLandingTheme(undefined) }
  }
})
