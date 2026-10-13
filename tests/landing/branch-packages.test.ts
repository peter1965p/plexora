import { describe, it, expect, vi, beforeAll } from 'vitest'

let rows: any[] = [], fail = false
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ send: async () => { if (fail) throw new Error('down'); return { Items: rows } } }) }))
vi.stubGlobal('defineEventHandler', (fn: any) => fn)
vi.stubGlobal('setResponseHeaders', () => {})
let handler: any
beforeAll(async () => { handler = (await import('../../server/api/public/branch-packages.get')).default })

describe('Öffentliche Branchen-Pakete', () => {
  it('nur eingebaute, kostenpflichtige Pakete; nur die erlaubten Felder; nach Name sortiert', async () => {
    rows = [
      { key: 'praxis', name: 'Praxis', icon: 'Stethoscope', price: 79, desc: 'd', features: ['a', 'b', 3, null], builtin: true, route: '/praxis', secret: 'x' },
      { key: 'fewo', name: 'Ferienwohnungen', icon: 'BedDouble', price: '79', desc: 'd', features: [], builtin: true, route: '/fewo' },
      { key: 'plug', name: 'Fremdes Plugin', price: 9, builtin: false, remoteEntryUrl: 'https://x.example/geheim' },
      { key: 'gratis', name: 'Gratis', price: 0, builtin: true },
      { key: 'Böse Key!', name: 'X', price: 5, builtin: true },
    ]
    const r = await handler({})
    expect(r.packages.map((p: any) => p.key)).toEqual(['fewo', 'praxis'])
    expect(Object.keys(r.packages[1]).sort()).toEqual(['desc', 'features', 'icon', 'key', 'name', 'price'])
    expect(r.packages[1].features).toEqual(['a', 'b'])
    expect(r.packages[0].price).toBe(79)
    expect(JSON.stringify(r)).not.toMatch(/geheim|remoteEntryUrl|route|secret/)
  })
  it('lässt sich ein Paket mit landing:false ausblenden; Datenbankfehler ergibt eine leere Liste', async () => {
    rows = [{ key: 'a', name: 'A', price: 5, builtin: true, landing: false }, { key: 'b', name: 'B', price: 5, builtin: true }]
    expect((await handler({})).packages.map((p: any) => p.key)).toEqual(['b'])
    fail = true; expect(await handler({})).toEqual({ packages: [] })
  })
})
