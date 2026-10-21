import { requireAdminOrDemoRead } from '../../utils/demoRead'
import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { parseLandingTheme } from '../../../shared/landingTheme'

export default defineEventHandler(async (event) => {
  requireAdminOrDemoRead(event)
  const res = await getDynamoClient().send(new GetCommand({ TableName: 'plexora-settings', Key: { settingId: 'landing-theme', scope: 'global' } }))
  return { theme: parseLandingTheme(res.Item?.theme), updated: res.Item?.updated || '' }
})
