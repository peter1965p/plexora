import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import cfg from '../../shared/backupConfig.json'
import { BACKUP_TABLES, ALWAYS_DROP_FIELDS, S3_EXCLUDED_PREFIXES } from '../../server/utils/backup/config'
import { PUBLIC_S3_PREFIXES } from '../../server/utils/s3Policy'

const walk = (d: string, out: string[] = []) => { for (const n of readdirSync(d)) { if (['node_modules', '.nuxt', '.output', 'dist', '.git'].includes(n)) continue; const f = join(d, n); statSync(f).isDirectory() ? walk(f, out) : /\.(ts|vue|mjs|sh|py)$/.test(n) && out.push(f) } return out }
const used = new Set<string>()
for (const f of [...walk('server'), ...walk('scripts')]) for (const m of readFileSync(f, 'utf8').matchAll(/(?:TableName:\s*|--table-name\s+|table-name=)['"`]?(plexora-[a-z0-9-]+)/g)) used.add(m[1])
// Schreibweisen, die keine echten Tabellen sind
for (const x of ['plexora-restore-test', 'plexora-files', 'plexora-app', 'plexora-api', 'plexora-lambda-role', 'plexora-alerts']) used.delete(x)

describe('Eine Quelle für Skript und Server', () => {
  it('Server und Python-Skript lesen dieselbe Datei shared/backupConfig.json', () => {
    expect(readFileSync('server/utils/backup/config.ts', 'utf8')).toContain('shared/backupConfig.json')
    const py = readFileSync('scripts/aws/backup-plexora.py', 'utf8')
    expect(py).toContain('backupConfig.json'); expect(py).toContain('_CFG["alwaysDropFields"]'); expect(py).toContain('_CFG["s3"]["excludedPrefixes"]'); expect(py).toContain('_CFG["tables"]')
  })
  it('jede im Code verwendete Tabelle ist klassifiziert – eine neue Tabelle ohne Eintrag lässt den Test durchfallen', () => {
    const missing = [...used].filter(t => !(t in BACKUP_TABLES))
    expect(missing, `Tabelle(n) ohne Eintrag in shared/backupConfig.json (Mandantenbezug, platform oder skip mit Begründung): ${missing.join(', ')}`).toEqual([])
  })
  it('die Klassifizierung ist in sich stimmig', () => {
    for (const [t, r] of Object.entries(BACKUP_TABLES)) {
      if (r.mode === 'owner' || r.mode === 'ownerTenant') expect((r as any).attr, t).toBeTruthy()
      if (r.mode === 'via') { expect(BACKUP_TABLES[r.parent], `${t}: Elterntabelle`).toBeTruthy(); expect(['owner', 'ownerTenant']).toContain(BACKUP_TABLES[r.parent].mode); expect(r.parentField && r.childField).toBeTruthy() }
      if (r.mode === 'platform' || r.mode === 'skip') expect((r as any).reason.length, t).toBeGreaterThan(10)
    }
  })
  it('Ausschlussliste: Zahlungsschlüssel immer entfernt; Deploy-Zips und Sicherungen nie in der Datei-Sicherung; öffentliche Präfixe überschneiden sich nicht damit', () => {
    for (const f of ['stripeSecretKey', 'stripeWebhookSecret', 'paypalSecret', 'mollieApiKey', 'customApiKey']) expect(ALWAYS_DROP_FIELDS).toContain(f)
    expect(S3_EXCLUDED_PREFIXES).toEqual(expect.arrayContaining(['lambda/', 'lambda-deploy/', 'backups/']))
    for (const p of PUBLIC_S3_PREFIXES) expect(S3_EXCLUDED_PREFIXES.some(x => x.startsWith(p + '/'))).toBe(false)
    expect(cfg.s3.excludedPrefixes).toEqual(S3_EXCLUDED_PREFIXES)
  })
})
