import { describe, it, expect, vi } from 'vitest'
import { installGlobals, authEv, code } from '../botprotection/helpers'

vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => ({ send: async () => ({ Items: [] }) }) }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: async (e: string) => ({ 'maria@firma.de': 'chef@firma.de' } as Record<string, string>)[e] || e }))
installGlobals()
const { getUserId, queryByUser } = await import('../../server/utils/queryByUser')
const { assertOwner } = await import('../../server/utils/ownership')

const anon = { headers: {}, context: {} }
describe('Strikte Helfer: kein Rückfall auf demo-user', () => {
  it('getUserId: ohne Token 401, mit Token die E-Mail aus dem Token', async () => {
    expect(() => getUserId(anon)).toThrowError(/Anmeldung/)
    expect(() => getUserId({ headers: {}, context: { auth: { userId: 's', email: '', groups: [] } } })).toThrowError(/Anmeldung/)
    expect(getUserId(authEv('chef@firma.de'))).toBe('chef@firma.de')
  })
  it('assertOwner: ohne Token 401 (früher: Vergleich mit demo-user), Besitzer ok, Team-Mitglied ok, Fremder 403', async () => {
    expect(await code(assertOwner(anon, { userId: 'demo-user' }))).toBe(401)
    expect(await code(assertOwner(authEv('chef@firma.de'), { userId: 'chef@firma.de' }))).toBe(200)
    expect(await code(assertOwner(authEv('maria@firma.de'), { userId: 'chef@firma.de' }))).toBe(200)
    expect(await code(assertOwner(authEv('fremd@andere.de'), { userId: 'chef@firma.de' }))).toBe(403)
  })
  it('Zeilen unter demo-user sind für niemanden mehr über assertOwner erreichbar', async () => {
    expect(await code(assertOwner(authEv('fremd@andere.de'), { userId: 'demo-user' }))).toBe(403)
    expect(await code(assertOwner(authEv('demo@plexora.eu'), { userId: 'demo-user' }))).toBe(403)
  })
  it('queryByUser selbst liest nur die übergebene Kennung (kommt aus getUserId)', async () => {
    expect(await queryByUser('plexora-contacts', 'chef@firma.de')).toEqual([])
  })
})
