import { LambdaClient, GetAccountSettingsCommand, GetFunctionConcurrencyCommand, GetFunctionConfigurationCommand } from '@aws-sdk/client-lambda'
import { CloudWatchClient, GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch'
import { ListTablesCommand, DescribeTableCommand, DescribeContinuousBackupsCommand } from '@aws-sdk/client-dynamodb'
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { getDynamoClient } from './dynamodb'
import { rolesEnforced } from './teamRole'
import { planEnforced } from './tenantPlan'
import { DEMO_POOL, DEMO_BASE_EMAIL } from '../../shared/demo'
import { stateKey } from './demoSandbox'

// Datenquelle des PSC Office: gesammelte Plattform-Werte (nur für den Betreiber). Jeder Abschnitt fällt einzeln aus (fehlendes Recht, AWS nicht erreichbar), ohne die anderen zu stören.
export type Section<T> = { ok: true; data: T } | { ok: false; error: string }
export async function section<T>(fn: () => Promise<T>): Promise<Section<T>> {
  try { return { ok: true, data: await fn() } } catch (e: any) { return { ok: false, error: String(e?.name || 'Fehler').replace(/Exception$/, '').slice(0, 60) } }
}
const REGION = 'eu-central-1', FN = 'plexora-api'
const metric = async (name: string, stat: 'Sum' | 'Maximum' | 'Average', minutes: number, period: number) => {
  const r = await new CloudWatchClient({ region: REGION }).send(new GetMetricStatisticsCommand({ Namespace: 'AWS/Lambda', MetricName: name, Dimensions: [{ Name: 'FunctionName', Value: FN }], StartTime: new Date(Date.now() - minutes * 60_000), EndTime: new Date(), Period: period, Statistics: [stat] }))
  return (r.Datapoints || []).map(d => Number((d as any)[stat]) || 0)
}
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)

export async function lambdaSection() {
  const lam = new LambdaClient({ region: REGION })
  const [acc, conc, cfg] = await Promise.all([lam.send(new GetAccountSettingsCommand({})), lam.send(new GetFunctionConcurrencyCommand({ FunctionName: FN })), lam.send(new GetFunctionConfigurationCommand({ FunctionName: FN }))])
  const [now, inv, thr, err, dur] = await Promise.allSettled([metric('ConcurrentExecutions', 'Maximum', 30, 60), metric('Invocations', 'Sum', 1440, 3600), metric('Throttles', 'Sum', 1440, 3600), metric('Errors', 'Sum', 1440, 3600), metric('Duration', 'Average', 1440, 3600)])
  const val = <T>(r: PromiseSettledResult<T>, d: T) => (r.status === 'fulfilled' ? r.value : d)
  const nowArr = val(now, [] as number[]), durArr = val(dur, [] as number[])
  return {
    accountLimit: acc.AccountLimit?.ConcurrentExecutions ?? 0, unreserved: acc.AccountLimit?.UnreservedConcurrentExecutions ?? 0, reserved: conc.ReservedConcurrentExecutions ?? 0,
    memoryMb: cfg.MemorySize ?? 0, runtime: cfg.Runtime || '', timeoutS: cfg.Timeout ?? 0, lastModified: cfg.LastModified || '', version: (cfg as any).Version || '',
    concurrentNow: nowArr.length ? Math.max(...nowArr) : 0, invocations24h: Math.round(sum(val(inv, []))), throttles24h: Math.round(sum(val(thr, []))), errors24h: Math.round(sum(val(err, []))),
    avgMs: durArr.length ? Math.round(sum(durArr) / durArr.length) : 0, metricsOk: [now, inv, thr, err, dur].every(r => r.status === 'fulfilled'),
  }
}

// Datenbank: Tabellen, Datensätze, Größe, Wiederherstellung (PITR), Löschschutz. 2 Abfragen je Tabelle: deshalb 10 Minuten zwischengespeichert.
let dbCache: { at: number; data: any } | null = null
export async function dbSection(force = false) {
  if (!force && dbCache && Date.now() - dbCache.at < 10 * 60_000) return { ...dbCache.data, cachedAt: new Date(dbCache.at).toISOString() }
  const db = getDynamoClient(), names: string[] = []
  let start: string | undefined
  do { const r: any = await db.send(new ListTablesCommand({ ExclusiveStartTableName: start })); names.push(...(r.TableNames || []).filter((n: string) => n.startsWith('plexora-'))); start = r.LastEvaluatedTableName } while (start)
  let items = 0, bytes = 0, pitr = 0, protectedN = 0, failed = 0
  const queue = [...names]
  await Promise.all(Array.from({ length: 12 }, async () => {
    for (let n = queue.shift(); n; n = queue.shift()) {
      try {
        const [t, b]: any[] = await Promise.all([db.send(new DescribeTableCommand({ TableName: n })), db.send(new DescribeContinuousBackupsCommand({ TableName: n }))])
        items += t.Table?.ItemCount || 0; bytes += t.Table?.TableSizeBytes || 0
        if (t.Table?.DeletionProtectionEnabled) protectedN++
        if (b.ContinuousBackupsDescription?.PointInTimeRecoveryDescription?.PointInTimeRecoveryStatus === 'ENABLED') pitr++
      } catch { failed++ }
    }
  }))
  const data = { tables: names.length, items, bytes, pitrEnabled: pitr, deletionProtected: protectedN, failed }
  dbCache = { at: Date.now(), data }
  return { ...data, cachedAt: new Date().toISOString() }
}

export function protectionSection() {
  const cfg: any = useRuntimeConfig()
  const on = (v: any) => v === true || v === 'true'
  return { roles: rolesEnforced(), plan: planEnforced(), auth: on(cfg.authEnforce), welcomeLink: on(cfg.welcomeLink) }
}

export async function demoSection() {
  const db = getDynamoClient()
  const states = await Promise.all([DEMO_BASE_EMAIL, ...DEMO_POOL].map(async e => ((await db.send(new GetCommand({ TableName: 'plexora-settings', Key: stateKey(e) }))).Item || {}) as any))
  const pool = states.slice(1), cutoff = Date.now() - 45 * 60_000
  return { poolSize: DEMO_POOL.length, leased: pool.filter(s => s.leasedAt && Date.parse(s.leasedAt) > cutoff).length, dirty: states.filter(s => s.dirty).length, lastReset: states.map(s => s.lastResetAt).filter(Boolean).sort().pop() || '' }
}

export async function backupSection(owner: string) {
  const r: any = await getDynamoClient().send(new QueryCommand({ TableName: 'plexora-backup-jobs', KeyConditionExpression: '#o = :o', ExpressionAttributeNames: { '#o': 'owner' }, ExpressionAttributeValues: { ':o': owner } }))
  const jobs = ((r.Items || []) as any[]).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  const done = jobs.find(j => j.status === 'done' || j.status === 'completed' || j.status === 'ready')
  return { recent: jobs.length, last: done ? { kind: done.kind, at: done.finishedAt || done.createdAt, status: done.status } : null, lastAny: jobs[0] ? { kind: jobs[0].kind, status: jobs[0].status, at: jobs[0].createdAt } : null, external: false }
}

export function runtimeSection() {
  const mem = process.memoryUsage()
  return { node: process.version, region: process.env.AWS_REGION || REGION, uptimeS: Math.round(process.uptime()), rssMb: Math.round(mem.rss / 1048576), heapMb: Math.round(mem.heapUsed / 1048576), memoryLimitMb: Number(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE) || 0, functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION || '' }
}
