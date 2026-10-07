import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const run = (lines: string[]) => { const f = join(mkdtempSync(join(tmpdir(), 'rep-')), 'log.txt'); writeFileSync(f, lines.join('\n')); return execFileSync('bash', ['scripts/aws/enforce-report.sh', '--from-file', f], { encoding: 'utf8' }) }
const roles = (o: any) => `2026-10-07T18:00:00Z abc [roles] würde ablehnen ${JSON.stringify({ rule: true, ...o })}`
const plan = (o: any) => `2026-10-07T18:00:00Z abc [plan] würde ablehnen ${JSON.stringify(o)}`

describe('enforce-report.sh', () => {
  it('fasst Rollen- und Tarif-Einträge zusammen: Anzahl, verlangt/vorhanden, betroffene Mandanten', () => {
    const out = run([
      roles({ method: 'GET', path: '/api/finance', required: 'admin', role: 'member', tenant: 'aaaa1111' }), roles({ method: 'GET', path: '/api/finance', required: 'admin', role: 'member', tenant: 'aaaa1111' }),
      roles({ method: 'POST', path: '/api/team/invite', required: 'owner', role: 'admin', tenant: 'bbbb2222' }),
      plan({ method: 'GET', path: '/api/hr', need: 'hr', plan: 'free', tenant: 'cccc3333' }), plan({ what: 'upload', code: 'UPLOAD_TOO_LARGE', plan: 'free', tenant: 'cccc3333' }),
      'irgendeine andere Zeile', '[roles] kaputt {nicht json}',
    ])
    expect(out).toContain('== Rollen: 3 Aufrufe wären abgelehnt worden, 2 verschiedene'); expect(out).toMatch(/2x\s+GET\s+\/api\/finance\s+verlangt admin\s+hat member\s+\(1 Mandant/)
    expect(out).toMatch(/1x\s+POST\s+\/api\/team\/invite\s+verlangt owner\s+hat admin/)
    expect(out).toContain('== Tarif: 2 Aufrufe'); expect(out).toMatch(/GET\s+\/api\/hr\s+braucht hr\s+hat free/); expect(out).toMatch(/upload\s+UPLOAD_TOO_LARGE/)
  })
  it('keine Treffer: klare Meldung; die Ausgabe enthält nie Adressen', () => {
    expect(run(['nichts Passendes'])).toContain('Keine "würde ablehnen"-Einträge')
    expect(run([roles({ method: 'GET', path: '/api/finance', required: 'admin', role: 'member', tenant: 'aaaa1111', email: 'geheim@x.de' })])).not.toContain('geheim@x.de')
  })
  it('liest nur: kein schreibender AWS-Befehl im Skript', () => {
    const sh = require('node:fs').readFileSync('scripts/aws/enforce-report.sh', 'utf8')
    expect(sh).not.toMatch(/aws [a-z0-9-]+ (put|create|update|delete|attach|set|publish|invoke)/); expect(sh).toContain('filter-log-events')
  })
})
