import { DynamoDBClient, ScanCommand, DescribeTableCommand, type ScanCommandInput } from '@aws-sdk/client-dynamodb'
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHash } from 'node:crypto'
import { SOURCE_BUCKET, S3_EXCLUDED_PREFIXES } from './config'
import { patchJob } from './jobs'
import type { ExportDeps } from './export'

const REGION = 'eu-central-1'
export const backupBucket = () => String(useRuntimeConfig().backupBucket || '')
export const workerFunction = () => String(useRuntimeConfig().backupWorkerFunction || '')

/** Schlüssel der Archivdatei: je Besitzer ein eigener Ordner (gehasht, keine E-Mail im Schlüssel). */
export const archiveKey = (owner: string, jobId: string) => `jobs/${createHash('sha256').update(owner.toLowerCase()).digest('hex').slice(0, 16)}/${jobId}.plxbak`

export function realDeps(owner: string, jobId: string): ExportDeps & { archiveKey: string } {
  const ddb = new DynamoDBClient({ region: REGION }); const s3 = new S3Client({ region: REGION }); const key = archiveKey(owner, jobId)
  return {
    archiveKey: key,
    async scan(table) { const out: any[] = []; let start: ScanCommandInput['ExclusiveStartKey']; do { const r = await ddb.send(new ScanCommand({ TableName: table, ExclusiveStartKey: start })); out.push(...(r.Items || [])); start = r.LastEvaluatedKey } while (start); return out },
    async describe(table) { const r = await ddb.send(new DescribeTableCommand({ TableName: table })); return r.Table },
    async tenantIdFor(email) {
      const r = await ddb.send(new ScanCommand({ TableName: 'plexora-nexora', FilterExpression: 'email = :e', ExpressionAttributeValues: { ':e': { S: email } } }))
      return r.Items?.[0]?.tenantId?.S || null
    },
    async listFiles() {
      const out: { key: string; size: number }[] = []; let token: string | undefined
      do { const r = await s3.send(new ListObjectsV2Command({ Bucket: SOURCE_BUCKET, ContinuationToken: token })); for (const o of r.Contents || []) if (o.Key && !S3_EXCLUDED_PREFIXES.some(p => o.Key!.startsWith(p))) out.push({ key: o.Key, size: o.Size || 0 }); token = r.NextContinuationToken } while (token)
      return out
    },
    async getFile(k) { try { const r = await s3.send(new GetObjectCommand({ Bucket: SOURCE_BUCKET, Key: k })); return Buffer.from(await r.Body!.transformToByteArray()) } catch { return null } },
    async putArchive(buf) { await s3.send(new PutObjectCommand({ Bucket: backupBucket(), Key: key, Body: buf, ContentType: 'application/octet-stream', ServerSideEncryption: 'AES256' })) },
    async updateJob(patch) { await patchJob(owner, jobId, patch) },
  }
}

export async function presignDownload(key: string, filename: string, seconds = 600): Promise<string> {
  return getSignedUrl(new S3Client({ region: REGION }), new GetObjectCommand({ Bucket: backupBucket(), Key: key, ResponseContentDisposition: `attachment; filename="${filename}"` }), { expiresIn: seconds })
}
export async function deleteArchive(key: string): Promise<void> { await new S3Client({ region: REGION }).send(new DeleteObjectCommand({ Bucket: backupBucket(), Key: key })) }

/** Startet den Worker asynchron (Event-Aufruf, kein Warten). Die Nutzlast enthält den abgeleiteten Schlüssel, nie die Passphrase. */
export async function invokeWorker(body: Record<string, unknown>): Promise<void> {
  const secret = String(useRuntimeConfig().newsletterCronSecret || '')
  const payload = { httpMethod: 'POST', path: '/api/internal/backup/run', headers: { 'x-internal-cron-secret': secret, 'content-type': 'application/json' }, body: JSON.stringify(body), isBase64Encoded: false }
  await new LambdaClient({ region: REGION }).send(new InvokeCommand({ FunctionName: workerFunction(), InvocationType: 'Event', Payload: Buffer.from(JSON.stringify(payload)) }))
}
