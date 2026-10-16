import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from '../../../../../utils/dynamodb'
import { enforcePublicRateLimit } from '../../../../../utils/rateLimit'
import { loadSite, siteCommentsMode, COMMENTS_TABLE } from '../../../../../utils/siteVisitor'

// Freigegebene Kommentare eines Beitrags. Ist die Funktion ausgeschaltet (Webseite oder Beitrag), kommt "off" und keine Liste.
// Nur Name, Text und Zeit werden ausgegeben, nie die E-Mail-Adresse.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'blog-comments-read')
  const tenantId = String(getRouterParam(event, 'tenantId') || ''), slug = String(getRouterParam(event, 'slug') || '')
  const site = await loadSite(tenantId), mode = siteCommentsMode(site)
  if (mode === 'off') return { mode: 'off', comments: [] }
  const db = getDynamoClient()
  const post = ((await db.send(new QueryCommand({ TableName: 'plexora-blog', KeyConditionExpression: 'tenantId = :t', FilterExpression: 'slug = :sl AND #st = :s', ExpressionAttributeNames: { '#st': 'status' }, ExpressionAttributeValues: { ':t': tenantId, ':sl': slug, ':s': 'published' } }))).Items || [])[0]
  if (!post) throw createError({ statusCode: 404, message: 'Post nicht gefunden' })
  if (post.commentsEnabled === false) return { mode: 'off', comments: [] }
  const rows = ((await db.send(new QueryCommand({ TableName: COMMENTS_TABLE, KeyConditionExpression: 'tenantId = :t', FilterExpression: 'postId = :p AND #st = :a', ExpressionAttributeNames: { '#st': 'status' }, ExpressionAttributeValues: { ':t': tenantId, ':p': post.postId, ':a': 'approved' } }))).Items || [])
  return { mode, comments: rows.sort((a: any, b: any) => String(a.created).localeCompare(String(b.created))).map((c: any) => ({ commentId: c.commentId, name: c.authorName, text: c.text, created: c.created })) }
})
