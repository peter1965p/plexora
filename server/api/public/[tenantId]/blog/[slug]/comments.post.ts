import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { createHash, randomUUID } from 'node:crypto'
import { getDynamoClient } from '../../../../../utils/dynamodb'
import { enforcePublicRateLimit, checkRateLimit } from '../../../../../utils/rateLimit'
import { notifySystem } from '../../../../../utils/notifications'
import { loadSite, siteCommentsMode, requireVisitor, COMMENTS_TABLE } from '../../../../../utils/siteVisitor'
import { parseCommentText, VisitorError } from '../../../../../../shared/siteVisitors'

// Kommentar schreiben: nur angemeldet (bestätigtes Konto), nur wenn die Funktion an ist. Je nach Einstellung sofort sichtbar oder erst nach Freigabe.
export default defineEventHandler(async (event) => {
  setResponseHeaders(event, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' })
  await enforcePublicRateLimit(event, 'blog-comment-write')
  const tenantId = String(getRouterParam(event, 'tenantId') || ''), slug = String(getRouterParam(event, 'slug') || '')
  const site = await loadSite(tenantId), mode = siteCommentsMode(site)
  if (mode === 'off') throw createError({ statusCode: 403, message: 'Kommentare sind hier ausgeschaltet.' })
  const body: any = await readBody(event).catch(() => ({}))
  const visitor = await requireVisitor(body?.token, tenantId)
  const db = getDynamoClient()
  const post = ((await db.send(new QueryCommand({ TableName: 'plexora-blog', KeyConditionExpression: 'tenantId = :t', FilterExpression: 'slug = :sl AND #st = :s', ExpressionAttributeNames: { '#st': 'status' }, ExpressionAttributeValues: { ':t': tenantId, ':sl': slug, ':s': 'published' } }))).Items || [])[0]
  if (!post) throw createError({ statusCode: 404, message: 'Post nicht gefunden' })
  if (post.commentsEnabled === false) throw createError({ statusCode: 403, message: 'Zu diesem Beitrag sind Kommentare ausgeschaltet.' })
  let text: string
  try { text = parseCommentText(body?.text) } catch (e) { if (e instanceof VisitorError) throw createError({ statusCode: 400, message: e.message }); throw e }
  // Falle für Skripte: dieses versteckte Feld füllt kein Mensch aus. Scheinbar erfolgreich antworten, nichts speichern.
  if (typeof body?.website === 'string' && body.website.trim()) return { ok: true, status: 'pending', message: 'Danke! Dein Kommentar wird geprüft.' }
  const who = createHash('sha256').update(tenantId + visitor.email).digest('hex').slice(0, 32)
  if (!(await checkRateLimit('blog-comment:burst', who, 1, 15))) throw createError({ statusCode: 429, message: 'Bitte warte einen Moment, bevor du wieder kommentierst.' })
  if (!(await checkRateLimit('blog-comment:day', who, 20, 86400))) throw createError({ statusCode: 429, message: 'Du hast heute schon viele Kommentare geschrieben. Bitte versuche es morgen wieder.' })
  const status = mode === 'open' ? 'approved' : 'pending'
  const comment = { tenantId, commentId: randomUUID(), postId: post.postId, slug, authorEmail: visitor.email, authorName: visitor.name, text, status, created: new Date().toISOString() }
  await db.send(new PutCommand({ TableName: COMMENTS_TABLE, Item: comment, ConditionExpression: 'attribute_not_exists(commentId)' }))
  if (status === 'pending') { try { await notifySystem({ userId: String(site.email), type: 'blog_comment', title: 'Neuer Kommentar wartet auf Freigabe', message: `${visitor.name} zu „${String(post.title).slice(0, 80)}“`, level: 'info', link: '/blog?tab=comments' } as any) } catch { /* der Kommentar zählt, auch wenn die Benachrichtigung scheitert */ } }
  return { ok: true, status, message: status === 'approved' ? 'Danke, dein Kommentar ist veröffentlicht.' : 'Danke! Dein Kommentar erscheint, sobald er geprüft wurde.', ...(status === 'approved' ? { comment: { commentId: comment.commentId, name: comment.authorName, text, created: comment.created } } : {}) }
})
