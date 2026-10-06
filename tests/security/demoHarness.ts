import { vi } from 'vitest'
import { installGlobals } from '../botprotection/helpers'

// Gemeinsame Test-Werkzeuge für Block d: fake DynamoDB mit Aufzeichnung, Token-Ereignisse, Tabellen-Zeilen.
export interface Call { n: string; table: string; input: any }
export const calls: Call[] = []
export const rows: Record<string, any[]> = {}

export const TEAM: Record<string, string> = { 'maria@firma.de': 'chef@firma.de' }
export const resolveFake = async (e: string) => TEAM[e] || e

export function fakeClient() {
  return {
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const table = i.TableName
      calls.push({ n, table, input: i })
      const t = rows[table] || []
      if (n === 'GetCommand') return { Item: t.find(r => Object.entries(i.Key).every(([k, v]) => r[k] === v)) }
      if (n === 'QueryCommand' || n === 'ScanCommand') {
        const vals = Object.values(i.ExpressionAttributeValues || {})
        const hit = t.filter(r => vals.includes(r.userId) || vals.includes(r.scope) || vals.includes(r.tenantId))
        return { Items: hit, Count: hit.length }
      }
      return {}
    },
  }
}

export function reset() { calls.length = 0; for (const k of Object.keys(rows)) delete rows[k] }
export const writes = () => calls.filter(c => ['PutCommand', 'UpdateCommand', 'DeleteCommand'].includes(c.n))
export const everything = () => JSON.stringify(calls)

export const anon = () => ({ headers: {}, context: {}, params: {}, query: {}, body: {} })
export const tok = (email: string, extra: any = {}, groups: string[] = ['customers']) =>
  ({ headers: { 'x-forwarded-for': '203.0.113.9' }, context: { auth: { userId: `sub-${email}`, email, groups } }, params: {}, query: {}, body: {}, ...extra })
export const status = (p: Promise<any>) => p.then(() => 200, (e: any) => e.statusCode ?? 500)

export function setup() { installGlobals() }
export { vi }
