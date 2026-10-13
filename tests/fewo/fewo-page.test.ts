import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

// Die Oberfläche darf nur Routen aufrufen, die es gibt (Methode + Pfad), und die Seite muss in den Rollen- und Modulregeln stehen.
const page = readFileSync('app/pages/fewo/index.vue', 'utf8')
const calls = [...page.matchAll(/api(?:<[^>]*>)?\(\s*[`'](\/[^`']*)[`'](?:\s*,\s*\{[^}]*?method:\s*'(\w+)')?/g)].map(m => ({ path: m[1].replace(/\$\{[^}]+\}/g, '[id]'), method: (m[2] || 'GET').toLowerCase() }))
import { globSync } from 'node:fs'
const known = new Set(globSync('server/api/fewo/**/*.ts').map(f => {
  const m = /^server\/api\/fewo\/(.*?)(?:\/index)?\.(get|post|put|delete)\.ts$/.exec(f.replace(/\\/g, '/'))!
  return `${m[2]} /${m[1].replace(/\[[^\]]+\]/g, '[x]')}`
}))
describe('FeWo-Seite', () => {
  it('ruft nur vorhandene Routen auf', () => {
    expect(calls.length).toBeGreaterThan(10)
    const missing = calls.filter(c => !known.has(`${c.method} ${c.path.replace(/\[id\]/g, '[x]')}`))
    expect(missing.map(c => `${c.method.toUpperCase()} ${c.path}`)).toEqual([])
  })
  it('hat eine Rollen- und eine Modulregel', async () => {
    const { areaForPath } = await import('../../shared/roles')
    expect(areaForPath('/fewo')?.role).toBe('admin')
    const { findModuleRule } = await import('../../server/utils/moduleAccess')
    expect(findModuleRule('/api/fewo/units')?.need).toEqual({ branch: 'fewo' })
  })
  it('Kanal-Adressen werden in der Oberfläche nie angezeigt (nur Servername)', () => { expect(page).not.toMatch(/\{\{\s*f\.url\s*\}\}/) })
})
