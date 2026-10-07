import { vi } from 'vitest'

// Gemeinsamer Fake für die Einladungs-Tests: Teammitglieder, Fremddaten-Tabellen, Zähler und eine DynamoDB, die ConditionExpressions wirklich auswertet.
export const st = {
  members: new Map<string, any>(),                    // "tenantId|memberEmail"
  ownData: {} as Record<string, string[]>,            // Tabelle -> E-Mails mit Daten (Partitionsschlüssel userId)
  nexora: [] as any[], licenses: [] as any[],
  counters: new Map<string, number>(),
  updates: [] as any[], puts: [] as any[], deletes: [] as any[], sent: [] as any[],
  failTables: false,
}
export const reset = () => { st.members = new Map(); st.ownData = {}; st.nexora = []; st.licenses = []; st.counters = new Map(); st.updates = []; st.puts = []; st.deletes = []; st.sent = []; st.failTables = false }
export const key = (t: string, m: string) => `${t}|${m}`

export const fakeDb = () => ({
  async send(cmd: any) {
    const n = cmd.constructor.name; const i = cmd.input; const t = i.TableName
    if (t === 'plexora-newsletter-ratelimit' && n === 'UpdateCommand') { const c = (st.counters.get(i.Key.throttleKey) || 0) + 1; st.counters.set(i.Key.throttleKey, c); return { Attributes: { count: c } } }
    if (t === 'plexora-team-members') {
      if (n === 'ScanCommand') { const tok = i.ExpressionAttributeValues[':t']; return { Items: [...st.members.values()].filter(m => m.inviteToken === tok && m.status === 'invited') } }
      if (n === 'QueryCommand') { if (st.failTables) throw new Error('boom'); const v = i.ExpressionAttributeValues[':t']; return { Items: [...st.members.values()].filter(m => m.tenantId === v).slice(0, i.Limit || 99) } }
      if (n === 'GetCommand') return { Item: st.members.get(key(i.Key.tenantId, i.Key.memberEmail)) }
      if (n === 'PutCommand') { st.puts.push(i.Item); st.members.set(key(i.Item.tenantId, i.Item.memberEmail), i.Item); return {} }
      if (n === 'DeleteCommand') { st.deletes.push(i.Key); st.members.delete(key(i.Key.tenantId, i.Key.memberEmail)); return {} }
      if (n === 'UpdateCommand') {
        st.updates.push(i)
        const row = st.members.get(key(i.Key.tenantId, i.Key.memberEmail))
        // ConditionExpression '#s = :invited AND inviteToken = :t' wirklich auswerten
        if (i.ConditionExpression) {
          const v = i.ExpressionAttributeValues
          if (!row || row.status !== v[':invited'] || row.inviteToken !== v[':t']) { const e: any = new Error('cond'); e.name = 'ConditionalCheckFailedException'; throw e }
        }
        if (row) { row.status = i.ExpressionAttributeValues[':active']; row.inviteToken = i.ExpressionAttributeValues[':empty']; row.joinedAt = i.ExpressionAttributeValues[':now'] }
        return {}
      }
    }
    if (n === 'QueryCommand') {
      if (st.failTables) throw new Error('boom')
      const u = i.ExpressionAttributeValues[':u']; return { Items: (st.ownData[t] || []).includes(u) ? [{ userId: u }] : [] }
    }
    if (t === 'plexora-nexora' && n === 'ScanCommand') return { Items: st.nexora.filter(x => x.email === i.ExpressionAttributeValues[':e']) }
    if (t === 'plexora-licenses' && n === 'ScanCommand') return { Items: st.licenses.filter(x => x.customerEmail === i.ExpressionAttributeValues[':e']) }
    return {}
  },
})

export function installTeamGlobals() {
  class HttpError extends Error { statusCode: number; constructor(o: any) { super(o.message); this.statusCode = o.statusCode } }
  vi.stubGlobal('defineEventHandler', (fn: any) => fn)
  vi.stubGlobal('createError', (o: any) => new HttpError(o))
  vi.stubGlobal('readBody', async (e: any) => e.body)
  vi.stubGlobal('getRouterParam', (e: any, n: string) => e.params?.[n])
  vi.stubGlobal('getHeader', () => undefined)
  vi.stubGlobal('useRuntimeConfig', () => ({ resendApiKey: 'k' }))
}
export const status = (p: Promise<any>) => p.then(() => 200, (e: any) => e.statusCode)
export const code = async (p: Promise<any>) => p.then(() => ({ code: 200 }), (e: any) => ({ code: e.statusCode, message: e.message }))
export const ev = (auth: any, body: any, params?: any) => ({ context: { auth }, body, params })

export const OWNER = { userId: 'sub-chef', email: 'chef@firma.de', groups: ['customers'], emailVerified: true }
export const INVITEE = { userId: 'sub-neu', email: 'neu@x.de', groups: ['customers'], emailVerified: true }
export const seedInvite = (over: any = {}) => {
  const row = { tenantId: 'chef@firma.de', memberEmail: 'neu@x.de', role: 'member', status: 'invited', inviteToken: 'tok-1111', invitedAt: new Date().toISOString(), joinedAt: '', ...over }
  st.members.set(key(row.tenantId, row.memberEmail), row); return row
}
