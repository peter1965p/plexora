import { QueryCommand, GetCommand, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { randomUUID } from 'crypto'
import { sendTemplateEmail, setContactLeadStatus, sendBookingLink } from './automations'

export const NODE_TYPES = ['trigger', 'send_email_template', 'send_booking_link', 'set_lead_status', 'wait', 'condition', 'end'] as const
export const SEQUENCE_TRIGGERS = ['new_lead', 'form_submitted'] as const
const MAX_NODES = 60

export interface SeqNode { id: string; type: string; position: { x: number; y: number }; data: Record<string, any> }
export interface SeqEdge { id: string; source: string; target: string; sourceHandle?: string | null }
export interface SeqGraph { nodes: SeqNode[]; edges: SeqEdge[] }

export function validateGraph(raw: any): { graph: SeqGraph; trigger: string } {
  const nodes = Array.isArray(raw?.nodes) ? raw.nodes : []
  const edges = Array.isArray(raw?.edges) ? raw.edges : []
  if (nodes.length === 0 || nodes.length > MAX_NODES) throw createError({ statusCode: 400, message: 'Ungültige Anzahl an Schritten' })

  const ids = new Set<string>()
  for (const n of nodes) {
    if (!n?.id || ids.has(n.id)) throw createError({ statusCode: 400, message: 'Schritt-IDs fehlen oder doppelt' })
    if (!(NODE_TYPES as readonly string[]).includes(n.type)) throw createError({ statusCode: 400, message: `Unbekannter Schritt: ${n.type}` })
    ids.add(n.id)
  }

  const triggerNodes = nodes.filter((n: any) => n.type === 'trigger')
  if (triggerNodes.length !== 1) throw createError({ statusCode: 400, message: 'Genau ein Start-Knoten erforderlich' })
  const trigger = triggerNodes[0].data?.trigger
  if (!(SEQUENCE_TRIGGERS as readonly string[]).includes(trigger)) throw createError({ statusCode: 400, message: 'Ungültiger Auslöser' })

  for (const e of edges) {
    if (!ids.has(e?.source) || !ids.has(e?.target)) throw createError({ statusCode: 400, message: 'Verbindung auf unbekannten Schritt' })
  }

  const graph: SeqGraph = {
    nodes: nodes.map((n: any) => ({
      id: String(n.id),
      type: n.type,
      position: { x: Number(n.position?.x) || 0, y: Number(n.position?.y) || 0 },
      data: n.data && typeof n.data === 'object' ? n.data : {},
    })),
    edges: edges.map((e: any) => ({
      id: String(e.id || randomUUID()),
      source: String(e.source),
      target: String(e.target),
      sourceHandle: e.sourceHandle ?? null,
    })),
  }
  return { graph, trigger }
}

function nextNode(graph: SeqGraph, fromId: string, handle: string | null): SeqNode | undefined {
  const edge = graph.edges.find(e => e.source === fromId && (handle === null ? !e.sourceHandle : e.sourceHandle === handle))
    ?? (handle === null ? graph.edges.find(e => e.source === fromId) : undefined)
  return edge ? graph.nodes.find(n => n.id === edge.target) : undefined
}

async function findContactStatus(userId: string, email: string): Promise<string> {
  const res = await getDynamoClient().send(new QueryCommand({
    TableName: 'plexora-contacts',
    KeyConditionExpression: 'userId = :u',
    FilterExpression: 'email = :e',
    ExpressionAttributeValues: { ':u': userId, ':e': email },
  }))
  const newest = [...(res.Items || [])].sort((a, b) => String(b.created).localeCompare(String(a.created)))[0]
  return newest?.leadStatus || ''
}

async function saveRun(run: any, patch: Record<string, any>) {
  Object.assign(run, patch, { updated: new Date().toISOString() })
  await getDynamoClient().send(new PutCommand({ TableName: 'plexora-sequence-runs', Item: run }))
}

// Führt Schritte ab run.currentNodeId aus, bis ein Warte-Knoten erreicht ist oder der Ablauf endet.
async function advanceRun(run: any, graph: SeqGraph) {
  let node = graph.nodes.find(n => n.id === run.currentNodeId)
  let guard = 0
  try {
    while (node && guard++ < 100) {
      if (node.type === 'end') break

      if (node.type === 'wait') {
        const days = Math.max(0, Number(node.data.days) || 1)
        const next = nextNode(graph, node.id, null)
        if (!next) break
        await saveRun(run, {
          currentNodeId: next.id,
          status: 'waiting',
          nextRunAt: new Date(Date.now() + days * 86400000).toISOString(),
        })
        return
      }

      if (node.type === 'condition') {
        const status = await findContactStatus(run.userId, run.email)
        const ok = status === node.data.equals
        node = nextNode(graph, node.id, ok ? 'yes' : 'no')
        continue
      }

      if (node.type === 'send_email_template') {
        if (node.data.templateId) await sendTemplateEmail(run.userId, node.data.templateId, run.email, run.data)
      } else if (node.type === 'send_booking_link') {
        await sendBookingLink(run.userId, run.email, run.data, node.data.appointmentTypeId || undefined)
      } else if (node.type === 'set_lead_status') {
        if (node.data.leadStatus) await setContactLeadStatus(run.userId, run.email, node.data.leadStatus)
      }
      node = nextNode(graph, node.id, null)
    }
    await saveRun(run, { currentNodeId: '', status: 'done', nextRunAt: '' })
  } catch (err: any) {
    await saveRun(run, { status: 'failed', lastError: String(err?.message || err).slice(0, 300), nextRunAt: '' })
  }
}

// Startet alle aktiven Sequenzen, deren Auslöser zum Ereignis passt (Formular/Lead).
export async function startSequences(userId: string, trigger: string, data: Record<string, any>) {
  if (!data.email) return
  const dynamo = getDynamoClient()
  const res = await dynamo.send(new QueryCommand({
    TableName: 'plexora-sequences',
    KeyConditionExpression: 'userId = :u',
    FilterExpression: '#t = :t AND enabled = :e',
    ExpressionAttributeNames: { '#t': 'trigger' },
    ExpressionAttributeValues: { ':u': userId, ':t': trigger, ':e': true },
  }))

  for (const seq of res.Items || []) {
    const graph: SeqGraph = seq.graph
    const triggerNode = graph.nodes.find(n => n.type === 'trigger')
    const first = triggerNode && nextNode(graph, triggerNode.id, null)
    if (!first) continue
    if (triggerNode?.data?.formId && triggerNode.data.formId !== data.formId) continue

    const active = await dynamo.send(new QueryCommand({
      TableName: 'plexora-sequence-runs',
      KeyConditionExpression: 'userId = :u',
      FilterExpression: 'sequenceId = :s AND email = :e AND #st IN (:a, :w)',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':u': userId, ':s': seq.sequenceId, ':e': data.email, ':a': 'active', ':w': 'waiting' },
    }))
    if ((active.Items || []).length > 0) continue

    const run = {
      userId,
      runId: randomUUID(),
      sequenceId: seq.sequenceId,
      email: data.email,
      data,
      currentNodeId: first.id,
      status: 'active',
      nextRunAt: '',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
    await dynamo.send(new PutCommand({ TableName: 'plexora-sequence-runs', Item: run }))
    await advanceRun(run, graph)
  }
}

// Täglicher Sweep: führt alle Läufe weiter, deren Wartezeit abgelaufen ist.
export async function sweepDueRuns(): Promise<{ processed: number; cancelled: number }> {
  const dynamo = getDynamoClient()
  const now = new Date().toISOString()
  const due: any[] = []
  let cursor: Record<string, any> | undefined
  do {
    const page = await dynamo.send(new ScanCommand({
      TableName: 'plexora-sequence-runs',
      FilterExpression: '#st = :w AND nextRunAt <= :now',
      ExpressionAttributeNames: { '#st': 'status' },
      ExpressionAttributeValues: { ':w': 'waiting', ':now': now },
      ExclusiveStartKey: cursor,
    }))
    due.push(...(page.Items || []))
    cursor = page.LastEvaluatedKey
  } while (cursor)

  let processed = 0
  let cancelled = 0
  for (const run of due) {
    const seqRes = await dynamo.send(new GetCommand({
      TableName: 'plexora-sequences',
      Key: { userId: run.userId, sequenceId: run.sequenceId },
    }))
    const seq = seqRes.Item
    if (!seq || !seq.enabled) {
      await saveRun(run, { status: 'cancelled', nextRunAt: '' })
      cancelled++
      continue
    }
    await advanceRun(run, seq.graph as SeqGraph)
    processed++
  }
  return { processed, cancelled }
}
