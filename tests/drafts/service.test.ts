import { describe, it, expect } from 'vitest'
import { InMemoryDraftRepository } from '../../server/utils/drafts/repository'
import { saveDraft, getDraft, deleteDraft, ownerKey, DRAFT_TTL_DAYS } from '../../server/utils/drafts/service'
import { DraftError } from '../../server/utils/drafts/schema'

const T = 'marketing-campaign'
const A = ownerKey('tenant-1@firma.de', 'sub-A')
const B = ownerKey('tenant-1@firma.de', 'sub-B')   // gleicher Tenant, anderer Nutzer
const C = ownerKey('tenant-2@firma.de', 'sub-A')   // gleicher Nutzer, anderer Tenant

describe('Upsert', () => {
  it('speichert pro Nutzer+Tenant+Typ genau einen Entwurf', async () => {
    const repo = new InMemoryDraftRepository()
    await saveDraft(repo, A, T, { data: { name: 'Eins' } })
    await saveDraft(repo, A, T, { data: { name: 'Zwei' } })
    await saveDraft(repo, A, T, { data: { name: 'Drei', headline: 'H' } })
    expect(repo.items.size).toBe(1)
    const d = await getDraft(repo, A, T)
    expect(d?.data).toEqual({ name: 'Drei', headline: 'H' })
  })

  it('setzt Status "draft" und Namen "Unbenannt", solange kein Name vergeben ist', async () => {
    const repo = new InMemoryDraftRepository()
    const d = await saveDraft(repo, A, T, { data: { headline: 'Nur Überschrift' } })
    expect(d.status).toBe('draft')
    expect(d.name).toBe('Unbenannt')
    const d2 = await saveDraft(repo, A, T, { data: { name: '   ' } })
    expect(d2.name).toBe('Unbenannt')
    const d3 = await saveDraft(repo, A, T, { data: { name: ' KI Beratung ' } })
    expect(d3.name).toBe('KI Beratung')
  })

  it('lässt Pflichtfelder weg: ein leerer Entwurf ist speicherbar', async () => {
    const repo = new InMemoryDraftRepository()
    await expect(saveDraft(repo, A, T, { data: {} })).resolves.toMatchObject({ name: 'Unbenannt' })
  })

  it('läuft nach 30 Tagen ab und wird danach nicht mehr geliefert', async () => {
    const repo = new InMemoryDraftRepository()
    const t0 = Date.UTC(2026, 9, 6)
    await saveDraft(repo, A, T, { data: { name: 'x' } }, t0)
    const rec = [...repo.items.values()][0]
    expect(rec.expiresAt).toBe(Math.floor(t0 / 1000) + DRAFT_TTL_DAYS * 86400)
    expect(await getDraft(repo, A, T, t0 + 29 * 86400_000)).not.toBeNull()
    expect(await getDraft(repo, A, T, t0 + 31 * 86400_000)).toBeNull()
  })

  it('behält die Client-Zeit für den Konfliktvergleich, begrenzt aber Zeiten aus der Zukunft', async () => {
    const repo = new InMemoryDraftRepository()
    const now = Date.UTC(2026, 9, 6, 12)
    const ok = await saveDraft(repo, A, T, { data: { name: 'x' }, clientUpdatedAt: now - 5000 }, now)
    expect(ok.clientUpdatedAt).toBe(now - 5000)
    const forged = await saveDraft(repo, A, T, { data: { name: 'x' }, clientUpdatedAt: now + 10 * 86400_000 }, now)
    expect(forged.clientUpdatedAt).toBeLessThanOrEqual(now + 60_000)
  })
})

describe('Besitzer-Trennung (kein Zugriff auf fremde Entwürfe)', () => {
  it('Nutzer B im selben Tenant sieht den Entwurf von Nutzer A nicht', async () => {
    const repo = new InMemoryDraftRepository()
    await saveDraft(repo, A, T, { data: { name: 'Geheim' } })
    expect(await getDraft(repo, B, T)).toBeNull()
  })

  it('derselbe Nutzer in einem anderen Tenant sieht ihn ebenfalls nicht', async () => {
    const repo = new InMemoryDraftRepository()
    await saveDraft(repo, A, T, { data: { name: 'Geheim' } })
    expect(await getDraft(repo, C, T)).toBeNull()
  })

  it('Speichern von B überschreibt A nicht, Löschen von B lässt A unberührt', async () => {
    const repo = new InMemoryDraftRepository()
    await saveDraft(repo, A, T, { data: { name: 'von A' } })
    await saveDraft(repo, B, T, { data: { name: 'von B' } })
    await deleteDraft(repo, B, T)
    expect((await getDraft(repo, A, T))?.data).toEqual({ name: 'von A' })
    expect(await getDraft(repo, B, T)).toBeNull()
  })

  it('ein Besitzer im Body wird ignoriert (nur Token-Daten zählen)', async () => {
    const repo = new InMemoryDraftRepository()
    await saveDraft(repo, A, T, { data: { name: 'x', owner: B, userId: 'sub-B', tenantId: 'tenant-2' } as any })
    expect([...repo.items.values()].map(r => r.owner)).toEqual([A])
    expect(await getDraft(repo, B, T)).toBeNull()
  })

  it('ownerKey verlangt Tenant und Nutzer-ID (sonst 401)', () => {
    for (const [s, u] of [['', 'sub'], ['tenant', ''], ['', '']]) {
      try { ownerKey(s, u); throw new Error('sollte werfen') } catch (e: any) { expect(e).toBeInstanceOf(DraftError); expect(e.statusCode).toBe(401) }
    }
  })
})

describe('Löschen', () => {
  it('löscht den eigenen Entwurf', async () => {
    const repo = new InMemoryDraftRepository()
    await saveDraft(repo, A, T, { data: { name: 'x' } })
    await deleteDraft(repo, A, T)
    expect(await getDraft(repo, A, T)).toBeNull()
  })

  it('lehnt unbekannte Typen ab', async () => {
    const repo = new InMemoryDraftRepository()
    await expect(getDraft(repo, A, 'gibts-nicht')).rejects.toBeInstanceOf(DraftError)
    await expect(deleteDraft(repo, A, '__proto__')).rejects.toBeInstanceOf(DraftError)
  })
})
