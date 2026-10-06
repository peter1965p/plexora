import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'
import { getDynamoClient } from '../dynamodb'
import { BACKUP_TTL_DAYS, type BackupKind } from './config'

// Aufträge der Sicherung: PK owner (E-Mail des Anfragenden), SK jobId. Jeder Zugriff läuft über (Anfragender, jobId) –
// ein anderer Nutzer findet fremde Aufträge nie (IDOR-Schutz). TTL-Attribut expiresAt räumt Zeilen nach 7 Tagen weg.
const TABLE = 'plexora-backup-jobs'
export type JobStatus = 'queued' | 'running' | 'done' | 'failed'
export interface AuditEvent { at: string; action: 'start' | 'download' | 'delete' | 'failed' | 'done'; by: string; ip?: string }
export interface Job {
  owner: string; jobId: string; kind: BackupKind; status: JobStatus; step?: string
  progress?: { done: number; total: number }; tables?: Record<string, { rows: number; bytes: number; verified: number }>
  files?: { count: number; bytes: number }; sizeBytes?: number; sha256?: string; fileKey?: string; warnings?: string[]
  error?: string; createdAt: string; startedAt?: string; finishedAt?: string; expiresAt: number; events: AuditEvent[]
}

export const jobTtlSeconds = () => Math.floor(Date.now() / 1000) + BACKUP_TTL_DAYS * 86400
export const STALE_AFTER_MS = 20 * 60 * 1000

export async function createJob(owner: string, kind: BackupKind, by: string, ip: string): Promise<Job> {
  const now = new Date().toISOString()
  const job: Job = { owner, jobId: randomUUID(), kind, status: 'queued', createdAt: now, expiresAt: jobTtlSeconds(), events: [{ at: now, action: 'start', by, ip }] }
  await getDynamoClient().send(new PutCommand({ TableName: TABLE, Item: job }))
  return job
}
export async function getJob(owner: string, jobId: string): Promise<Job | null> {
  const r = await getDynamoClient().send(new GetCommand({ TableName: TABLE, Key: { owner, jobId } }))
  const j = r.Item as Job | undefined
  return j && j.expiresAt > Math.floor(Date.now() / 1000) ? j : null
}
export async function listJobs(owner: string): Promise<Job[]> {
  const r = await getDynamoClient().send(new QueryCommand({ TableName: TABLE, KeyConditionExpression: '#o = :o', ExpressionAttributeNames: { '#o': 'owner' }, ExpressionAttributeValues: { ':o': owner } }))
  const now = Math.floor(Date.now() / 1000)
  return ((r.Items || []) as Job[]).filter(j => j.expiresAt > now).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export async function patchJob(owner: string, jobId: string, patch: Record<string, any>): Promise<void> {
  const names: Record<string, string> = {}; const values: Record<string, any> = {}; const sets: string[] = []
  Object.entries(patch).forEach(([k, v], i) => { names[`#k${i}`] = k; values[`:v${i}`] = v; sets.push(`#k${i} = :v${i}`) })
  await getDynamoClient().send(new UpdateCommand({ TableName: TABLE, Key: { owner, jobId }, UpdateExpression: 'SET ' + sets.join(', '), ExpressionAttributeNames: names, ExpressionAttributeValues: values }))
}
export async function addEvent(owner: string, jobId: string, ev: AuditEvent): Promise<void> {
  await getDynamoClient().send(new UpdateCommand({
    TableName: TABLE, Key: { owner, jobId }, UpdateExpression: 'SET events = list_append(if_not_exists(events, :e), :n)',
    ExpressionAttributeValues: { ':e': [], ':n': [ev] },
  }))
}
export async function removeJob(owner: string, jobId: string): Promise<void> {
  await getDynamoClient().send(new DeleteCommand({ TableName: TABLE, Key: { owner, jobId } }))
}
/** Läuft für diesen Besitzer schon ein Auftrag? Hängende Aufträge (älter als 20 Minuten) gelten als fehlgeschlagen und blockieren nicht. */
export async function runningJob(owner: string): Promise<Job | null> {
  for (const j of await listJobs(owner)) {
    if (j.status !== 'queued' && j.status !== 'running') continue
    if (Date.now() - new Date(j.createdAt).getTime() > STALE_AFTER_MS) { await patchJob(owner, j.jobId, { status: 'failed', error: 'Zeitüberschreitung' }); continue }
    return j
  }
  return null
}
/** Was nach außen geht: nie Dateischlüssel, Prüfsumme der Rohdaten oder Interna. */
export function publicJob(j: Job) {
  return { jobId: j.jobId, kind: j.kind, status: j.status, step: j.step, progress: j.progress, tables: j.tables, files: j.files, sizeBytes: j.sizeBytes, warnings: j.warnings, error: j.error, createdAt: j.createdAt, finishedAt: j.finishedAt, by: j.owner, expiresAt: j.expiresAt, downloadable: j.status === 'done' }
}
