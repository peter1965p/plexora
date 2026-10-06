import { describe, it, expect, vi, beforeEach } from 'vitest'
import { installGlobals, authEv, code } from '../botprotection/helpers'

const st = {
  registry: {} as Record<string, any>,
  licenses: [] as any[],
  tenants: [] as any[],
  updates: [] as any[],
}
vi.mock('../../server/utils/dynamodb', () => ({
  getDynamoClient: () => ({
    async send(cmd: any) {
      const n = cmd.constructor.name; const i = cmd.input; const t = i.TableName
      if (t === 'plexora-plugin-registry' && n === 'GetCommand') return { Item: st.registry[i.Key.key] }
      if (t === 'plexora-licenses' && n === 'ScanCommand') return { Items: st.licenses.filter(l => l.customerEmail === i.ExpressionAttributeValues[':e'] && l.status === 'active') }
      if (t === 'plexora-nexora' && n === 'ScanCommand') return { Items: st.tenants.filter(x => x.email === i.ExpressionAttributeValues[':e']) }
      if (t === 'plexora-nexora' && n === 'UpdateCommand') { st.updates.push(i.ExpressionAttributeValues[':m']); return {} }
      return {}
    },
  }),
}))
installGlobals()
const { default: branch } = await import('../../server/api/settings/branch-packages.post')

const ME = 'kunde@firma.de'
const call = (email: string, body: any, groups?: string[]) => (branch as any)(authEv(email, { body }, groups))
beforeEach(() => {
  st.registry = {
    automotive: { key: 'automotive', price: 59, builtin: true },
    gastro: { key: 'gastro', price: 59, builtin: true },
    gratis: { key: 'gratis', price: 0, builtin: false },
  }
  st.licenses = [{ customerEmail: ME, status: 'active', modules: ['crm', 'gastro'] }]
  st.tenants = [{ tenantId: 'T1', email: ME, branchModules: [{ key: 'immobilien', status: 'disabled' }] }]
  st.updates = []
})

describe('Branchen-Pakete installieren', () => {
  it('ohne Token 401, Demo-Konto 403', async () => {
    expect(await code((branch as any)({ headers: {}, context: {}, body: { packageKey: 'gratis' } }))).toBe(401)
    expect(await code(call('demo@plexora.eu', { packageKey: 'gratis' }))).toBe(403)
    expect(st.updates).toHaveLength(0)
  })
  it('kostenpflichtiges Paket ohne Lizenz: 403, nichts wird freigeschaltet', async () => {
    const err: any = await call(ME, { packageKey: 'automotive' }).catch(e => e)
    expect(err.statusCode).toBe(403); expect(err.message).toMatch(/kostenpflichtig/)
    expect(st.updates).toHaveLength(0)
  })
  it('Manipulation im Request (Preis, free, Lizenz) hilft nicht', async () => {
    expect(await code(call(ME, { packageKey: 'automotive', price: 0, free: true, licensed: true, action: 'install' }))).toBe(403)
    expect(st.updates).toHaveLength(0)
  })
  it('bezahltes Paket (in der Lizenz) lässt sich installieren', async () => {
    const res: any = await call(ME, { packageKey: 'gastro' })
    expect(res.branchModules.map((m: any) => m.key).sort()).toEqual(['gastro', 'immobilien'])
    expect(st.updates).toHaveLength(1)
  })
  it('kostenloses Paket (Preis 0) bleibt für jeden installierbar', async () => {
    const res: any = await call('anderer@firma.de', { packageKey: 'gratis' }).catch(e => e)
    // anderer@firma.de hat keinen Nexora-Eintrag -> 404 dort; mit Eintrag klappt es:
    expect(res.statusCode).toBe(404)
    st.tenants.push({ tenantId: 'T2', email: 'anderer@firma.de', branchModules: [] })
    expect(((await call('anderer@firma.de', { packageKey: 'gratis' })) as any).branchModules).toEqual([{ key: 'gratis', status: 'active' }])
  })
  it('Plattform-Admin darf jedes Paket (Store-Abkürzung für Admins)', async () => {
    expect(await code(call(ME, { packageKey: 'automotive' }, ['admins']))).toBe(200)
  })
  it('unbekanntes Paket: 404, ungültiger Schlüssel: 400', async () => {
    expect(await code(call(ME, { packageKey: 'gibtsnicht' }))).toBe(404)
    expect(await code(call(ME, { packageKey: '../x;drop' }))).toBe(400)
  })
  it('bereits vorhandenes (deaktiviertes) Paket wieder aktivieren braucht keine Lizenz; deaktivieren/deinstallieren immer möglich', async () => {
    expect(await code(call(ME, { packageKey: 'immobilien', action: 'install' }))).toBe(200)
    expect(await code(call(ME, { packageKey: 'immobilien', action: 'disable' }))).toBe(200)
    expect(await code(call(ME, { packageKey: 'immobilien', action: 'uninstall' }))).toBe(200)
  })
  it('enable/disable für ein nicht vorhandenes Paket schaltet nichts frei', async () => {
    const res: any = await call(ME, { packageKey: 'automotive', action: 'enable' })
    expect(res.branchModules.map((m: any) => m.key)).toEqual(['immobilien'])
  })
})
