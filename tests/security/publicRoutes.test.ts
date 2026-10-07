import { describe, it, expect, beforeAll } from 'vitest'
import { routeFiles, setupAnonEnv, makeEvent, trip, seed, WRITE_COMMANDS } from './routeCall'
import { isPublicRoute } from '../../server/utils/routePolicy'
import { PUBLIC_RULES } from '../../server/utils/routePolicy'
import { concretePath } from './routeScan'
import { EVIDENCE, isSecret, type Evidence } from './publicRoutes.evidence'

const routes = routeFiles(import.meta.glob('../../server/api/**/*.ts'))
const publicRoutes = routes.filter(r => isPublicRoute(concretePath(r.urlPath), r.method))
beforeAll(() => { setupAnonEnv() })

const ALWAYS_WRITABLE = ['plexora-newsletter-ratelimit']     // Drosselzähler

function useSeed(db: Record<string, any>) {
  seed.get = (table, cmd, input) => {
    if (WRITE_COMMANDS.test(cmd)) return {}
    const src = db[table]
    const rows = typeof src === 'function' ? src(input, cmd) : src
    if (cmd === 'GetCommand') return { Item: Array.isArray(rows) ? rows[0] : rows }
    return { Items: Array.isArray(rows) ? rows : rows ? [rows] : [], Count: 1 }
  }
}

async function probe(r: (typeof routes)[number], ev: Evidence) {
  trip.calls = []; trip.mode = 'seed'
  useSeed(ev.kind === 'gated' ? {} : ev.db)
  const mod: any = await r.load()
  const event: any = makeEvent(r.file, r.method, { params: { ...makeEvent(r.file, r.method).params, ...(ev.params || {}) }, query: ev.query || {}, body: (ev as any).body, headers: Object.fromEntries(Object.entries((ev as any).headers || {}).map(([k, v]) => [k.toLowerCase(), v])), rawBody: (ev as any).rawBody })
  let result: any, error: any
  try { result = await mod.default(event) } catch (e: any) { error = e }
  const allowedWrites = new Set([...ALWAYS_WRITABLE, ...(ev.kind === 'gated' ? [] : (ev.kind === 'read' ? (ev.writes || []) : ev.writes))])
  const allowedOther = ev.kind === 'gated' ? [] : (ev.allow || [])
  const side = trip.calls.filter((c) => {
    const [kind, cmd, table] = c.split(':')
    if (kind !== 'dynamo') return !allowedOther.some(a => c.startsWith(a))   // Mail, Netz, Stripe, S3, Cognito, Lambda … nur wenn die Route es ausdrücklich darf
    return WRITE_COMMANDS.test(cmd || '') && !allowedWrites.has(table)  // Schreibzugriff auf eine nicht erlaubte Tabelle
  })
  return { result, error, side, event }
}

describe('Öffentliche Routen: jede hat einen Nachweis', () => {
  it('Plausibilität: die Allowlist hat Regeln und es werden über 50 öffentliche Routen erkannt', () => { expect(PUBLIC_RULES.length).toBeGreaterThan(15); expect(publicRoutes.length).toBeGreaterThan(50) })
  it('jede öffentliche Route hat einen Eintrag in publicRoutes.evidence.ts – und jeder Eintrag gehört zu einer öffentlichen Route', () => {
    const have = new Set(publicRoutes.map(r => r.key)); const ids = Object.keys(EVIDENCE)
    expect(publicRoutes.map(r => r.key).filter(k => !EVIDENCE[k]), 'öffentliche Routen OHNE Nachweis').toEqual([])
    expect(ids.filter(k => !have.has(k)), 'Einträge ohne öffentliche Route').toEqual([])
  })
})

describe('Öffentliche Routen: keine Mandantendaten, nur Erlaubtes, keine Nebenwirkung', () => {
  const failures: string[] = []
  it('alle Proben bestehen', async () => {
    for (const r of publicRoutes) {
      const ev = EVIDENCE[r.key]; if (!ev) continue
      const { result, error, side } = await probe(r, ev)
      const where = r.key
      if (side.length && !(ev.kind === 'gated' && ev.gap)) failures.push(`${where}: unerlaubte Nebenwirkung ${side.join(', ')}`)
      const text = (v: any) => (typeof v === 'string' ? v : Buffer.isBuffer(v) ? '' : JSON.stringify(v ?? null))
      if (error) {
        const status = error.statusCode as number | undefined
        const okStatus = ev.kind === 'gated' ? ev.status : (ev.kind === 'write' ? ev.status : (ev.status || [200]))
        if (ev.kind === 'gated' && ev.gap && status && ev.status.includes(status)) { failures.push(`${where}: die Lücke ist geschlossen – "gap" im Nachweis entfernen`); continue }
        if (!status || !okStatus.includes(status)) failures.push(`${where}: Fehler ${status ?? 'ohne Status'} (${String(error.message).slice(0, 90)}) – erlaubt ${okStatus.join('/')}`)
        if (isSecret(String(error.message))) failures.push(`${where}: Fehlermeldung enthält ein Geheimnis`)
        continue
      }
      if (ev.kind === 'gated') {
        const open = !ev.status.some(s => s === 200 || s === 302)
        if (open && !ev.gap) failures.push(`${where}: antwortet ohne Geheimnis/Signatur (erwartet ${ev.status.join('/')})`)
        if (open && ev.gap) continue                       // dokumentierte Lücke
      }
      if (isSecret(text(result))) failures.push(`${where}: Antwort enthält Mandantendaten: ${(text(result).match(/GEHEIM-[A-Za-z0-9@._-]+/g) || []).slice(0, 4).join(', ')}`)
      if (ev.kind !== 'gated' && !('text' in ev && ev.text) && result && typeof result === 'object' && !Buffer.isBuffer(result)) {
        const extra = Object.keys(result).filter(k => !ev.keys.includes(k))
        if (extra.length) failures.push(`${where}: unerwartete Schlüssel ${extra.join(', ')}`)
      }
    }
    expect(failures, `\n${failures.join('\n')}`).toEqual([])
  }, 120_000)
})

describe('Dokumentierte Lücken dürfen nur schrumpfen', () => {
  it('es gibt keine offene Lücke mehr (der Resend-Webhook prüft jetzt die Signatur); eine neue müsste hier mit Begründung stehen', () => {
    const gaps = Object.entries(EVIDENCE).filter(([, e]) => e.kind === 'gated' && (e as any).gap)
    expect(gaps.map(([k]) => k)).toEqual([])
    for (const [, e] of gaps) expect(String((e as any).gap).length).toBeGreaterThan(40)
  })
})
