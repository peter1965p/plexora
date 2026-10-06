import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { clearLocalDrafts, LOCAL_DRAFT_PREFIX, type EnumerableStore } from '../../app/utils/draftAutosave'

function store(initial: Record<string, string>): EnumerableStore & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial))
  return {
    map,
    get length() { return map.size },
    key: i => [...map.keys()][i] ?? null,
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => { map.set(k, v) },
    removeItem: k => { map.delete(k) },
  }
}

describe('clearLocalDrafts', () => {
  it('entfernt alle Entwurfskopien (auch mehrerer Nutzer/Typen) und lässt alles andere stehen', () => {
    const s = store({
      'plx_draft:sub-A:marketing-campaign': '{}',
      'plx_draft:sub-B:marketing-campaign': '{}',
      'plx_draft:sub-A:andere-form': '{}',
      'plx_debug': '1',
      'theme': 'dark',
      'aws.cognito.keep': 'x',
    })
    expect(clearLocalDrafts(s)).toBe(3)
    expect([...s.map.keys()].sort()).toEqual(['aws.cognito.keep', 'plx_debug', 'theme'])
  })

  it('tut nichts, wenn keine Entwürfe vorhanden sind', () => {
    const s = store({ theme: 'dark' })
    expect(clearLocalDrafts(s)).toBe(0)
    expect(s.map.size).toBe(1)
  })

  it('übersteht einen gesperrten oder kaputten Speicher', () => {
    const broken = { length: 1, key() { throw new Error('x') }, getItem() { return null }, setItem() {}, removeItem() { throw new Error('x') } } as EnumerableStore
    expect(() => clearLocalDrafts(broken)).not.toThrow()
    expect(clearLocalDrafts(null)).toBeGreaterThanOrEqual(0)
  })

  it('das Präfix ist das des Autosavers', () => {
    expect(LOCAL_DRAFT_PREFIX).toBe('plx_draft:')
  })
})

describe('Schlüsselaufbau', () => {
  it('der Schlüssel enthält die Nutzer-ID aus dem Token, nie E-Mail oder Tenant', () => {
    const composable = readFileSync('app/composables/useDraftAutosave.ts', 'utf8')
    expect(composable).toContain('userKey: user.userId')
    expect(composable).not.toMatch(/userKey:\s*user\.email/)
    const core = readFileSync('app/utils/draftAutosave.ts', 'utf8')
    expect(core).toContain('${LOCAL_DRAFT_PREFIX}${this.opts.userKey}:${this.opts.formType}')
  })
})

describe('Löschen bei Abmeldung (Quellcode-Prüfung aller Abmelde-Pfade)', () => {
  const idx = (src: string, s: string) => src.indexOf(s)
  it('Menü-Abmeldung: sichert offene Entwürfe, löscht lokal, dann signOut', () => {
    const src = readFileSync('app/components/AppTopbar.vue', 'utf8')
    const body = src.slice(idx(src, 'async function logout()'))
    expect(idx(body, "'plx:session-expiring'")).toBeGreaterThan(-1)
    expect(idx(body, 'clearLocalDrafts()')).toBeGreaterThan(idx(body, "'plx:session-expiring'"))
    expect(idx(body, 'signOut()')).toBeGreaterThan(idx(body, 'clearLocalDrafts()'))
  })
  it('Inaktivitäts-Abmeldung: löscht lokal vor signOut', () => {
    const src = readFileSync('app/composables/useIdleTimer.ts', 'utf8')
    const body = src.slice(idx(src, 'async function doLogout()'))
    expect(idx(body, 'clearLocalDrafts()')).toBeGreaterThan(-1)
    expect(idx(body, 'signOut()')).toBeGreaterThan(idx(body, 'clearLocalDrafts()'))
  })
  it('Portal-Abmeldung und Anmelde-Seite (Nutzerwechsel) löschen ebenfalls', () => {
    const portal = readFileSync('app/layouts/portal.vue', 'utf8')
    expect(portal.slice(idx(portal, 'async function logout()'))).toMatch(/clearLocalDrafts\(\)[\s\S]*signOut\(\)/)
    const login = readFileSync('app/pages/login.vue', 'utf8')
    const calls = login.match(/clearLocalDrafts\(\)[^\n]*\n\s*try \{ await signOut\(\) \}/g) || []
    expect(calls.length).toBe(2)
  })
})
