import { PutCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../utils/dynamodb'
import { resolveUserId } from '../../utils/tenant'
import { randomUUID } from 'crypto'
import { requireAuth } from '../../utils/verifyAuth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const client = getDynamoClient()
  const page = {
    pageId:    randomUUID(),
    userId:    await resolveUserId(requireAuth(event).email),
    slug:      body.slug?.toLowerCase().replace(/\s+/g, '-'),
    title:     body.title,
    blocks:    body.blocks || [],
    inNav:     body.inNav ?? false,
    navLabel:  body.navLabel || body.title,
    status:    body.status || 'draft',
    created:   new Date().toISOString(),
    updated:   new Date().toISOString(),
  }
  await client.send(new PutCommand({ TableName: 'plexora-pages', Item: page }))
  return { success: true, page }
})
