import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'

// Der Planer (Projekte) darf nur Routen aufrufen, die es gibt.
const page = readFileSync('app/pages/projects/index.vue', 'utf8')
const known = new Set(globSync('server/api/projects/**/*.ts').map(f => { const m = /^server\/api\/projects\/(.*?)(?:\/index)?\.(get|post|put|patch|delete)\.ts$/.exec(f.replace(/\\/g, '/'))!; return `${m[2]} /${m[1].replace(/\[[^\]]+\]/g, '[x]')}` }))
describe('Planer-Seite', () => {
  it('ruft nur vorhandene Projekt-Routen auf', () => {
    const calls = [...page.matchAll(/useApiUrl\(`\/api\/projects([^`]*)`\)\s*,\s*\{\s*method:\s*'(\w+)'/g)].map(m => `${m[2].toLowerCase()} /${m[1].replace(/^\//, '').replace(/\$\{[^}]+\}/g, '[x]').replace(/\?.*$/, '')}`).map(s => s.replace(/^(\w+) \/\[x\]/, '$1 /[x]'))
    expect(calls.length).toBeGreaterThan(5)
    expect(calls.filter(c => !known.has(c))).toEqual([])
  })
  it('die Planung läuft über die geprüfte Route (schedule), nie über das freie Feld-Update', () => {
    expect(page).toContain('/schedule')
    expect(page).not.toMatch(/predecessors[^\n]*method:\s*'PATCH'/)
  })
})
