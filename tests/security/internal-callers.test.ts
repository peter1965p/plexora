import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { isPublicRoute } from '../../server/utils/routePolicy'

// Absicherung: Kein serverinterner Ablauf (PDF-Erzeugung, Mahnung, Cron, Lambda-Ereignisse) ruft die per Token geschützten
// Routen über HTTP auf. Würde einer das tun, bekäme er ohne Token 401. Diese Ströme lesen direkt aus DynamoDB.
const files: string[] = []
const walk = (d: string) => { for (const n of readdirSync(d)) { const f = join(d, n); statSync(f).isDirectory() ? walk(f) : f.endsWith('.ts') && files.push(f) } }
walk('server')

const CLOSED_PATHS = ['/api/settings/invoice', '/api/settings/invoice-presets', '/api/settings/branch-packages', '/api/team/', '/api/campaigns/presets', '/api/automotive/pricetag-templates/presets']
const ROUTE_FILES = /^server\/api\/(settings\/(invoice|invoice-presets|branch-packages)\.|team\/|campaigns\/presets|automotive\/pricetag-templates\/presets)/

describe('Interne Aufrufer der geschlossenen Routen', () => {
  it('kein Server-Code ruft diese Routen per Pfad auf (außer den Routen selbst)', () => {
    const hits: string[] = []
    for (const f of files) {
      const norm = f.replace(/\\/g, '/')
      if (ROUTE_FILES.test(norm)) continue
      const src = readFileSync(f, 'utf8')
      for (const p of CLOSED_PATHS) if (src.includes(p)) hits.push(`${norm}: ${p}`)
    }
    expect(hits).toEqual([])
  })

  it('die PDF-Erzeugung (Chromium) rendert aus übergebenem HTML und ruft keine API auf', () => {
    const src = readFileSync('server/utils/invoiceTemplate.ts', 'utf8')
    expect(src).toContain('page.setContent(html')
    expect(src).not.toMatch(/\$fetch\(|\bfetch\(|apiBase|execute-api|page\.goto\(/)
  })

  it('PDF-Erzeugung und Mahnversand lesen die Rechnungseinstellungen direkt aus DynamoDB', () => {
    for (const f of ['server/api/finance/[id]/pdf.get.ts', 'server/api/finance/[id]/send.post.ts', 'server/api/settings/invoice-template/render.post.ts']) {
      const src = readFileSync(f, 'utf8')
      expect(src, f).toContain("settingId: 'invoice'")
      expect(src, f).not.toMatch(/\$fetch\(|\bfetch\(/)
    }
  })

  it('Zeitplan-Routen (EventBridge, Secret-Header) bleiben ohne Token erreichbar', () => {
    for (const p of ['/api/newsletter/cron/run-automations', '/api/sequences/cron/sweep', '/api/termine/cron/reminders'])
      expect(isPublicRoute(p, 'POST'), p).toBe(true)
  })
})
