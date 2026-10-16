import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'

// Die Blog-Verwaltung darf nur Routen aufrufen, die es gibt (Methode + Pfad).
const page = readFileSync('app/pages/blog.vue', 'utf8')
const known = new Set(globSync('server/api/blog/**/*.ts').map(f => { const m = /^server\/api\/blog\/(.*?)(?:\/index)?\.(get|post|put|patch|delete)\.ts$/.exec(f.replace(/\\/g, '/'))!; return `${m[2]} /api/blog${m[1] === 'index' ? '' : '/' + m[1].replace(/\[[^\]]+\]/g, '[x]')}` }))
describe('Blog-Verwaltung', () => {
  it('Kommentar-Routen der Seite existieren', () => {
    const calls = [...page.matchAll(/useApiUrl\(`?'?(\/api\/blog[^`')]*)`?'?\)(?:\s*,\s*\{[^}]*?method:\s*'(\w+)')?/g)].map(m => `${(m[2] || 'GET').toLowerCase()} ${m[1].replace(/\$\{[^}]+\}/g, '[x]')}`)
    const comments = calls.filter(c => c.includes('/comments'))
    expect(comments.length).toBeGreaterThanOrEqual(5)
    expect(comments.filter(c => !known.has(c))).toEqual([])
  })
})
