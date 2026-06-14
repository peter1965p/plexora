import { GetCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'

const DEFAULT_CONTENT = `# Allgemeine Geschäftsbedingungen

*Hier können Sie Ihre AGB als Markdown-Text einfügen.*

Nutzen Sie # für Überschriften und **fett** für Hervorhebungen.
`

export default defineEventHandler(async () => {
  const client = getDynamoClient()
  try {
    const result = await client.send(new GetCommand({
      TableName: 'plexora-settings',
      Key: { settingId: 'agb', scope: 'global' }
    }))
    return { agb: result.Item || { content: DEFAULT_CONTENT, updated: null } }
  } catch {
    return { agb: { content: DEFAULT_CONTENT, updated: null } }
  }
})
