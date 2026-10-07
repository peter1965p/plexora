import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'

// Sicherungsdateien enthalten echte Kundendaten (auch entschlüsselt) und dürfen nie versehentlich committet werden (git add -A).
const ignored = (path: string) => { try { execFileSync('git', ['check-ignore', '-q', path]); return true } catch { return false } }

describe('.gitignore schützt Sicherungsdateien', () => {
  it('verschlüsselte, entschlüsselte und entpackte Sicherungen werden ignoriert', () => {
    for (const f of ['plexora-sicherung-meine-daten-2026-10-07.plxbak', 'plexora-sicherung-meine-daten-2026-10-07.zip', 'plexora-sicherung-gesamt-2026-10-07.plxbak', 'x/meine.plxbak', 'plexora-sicherung-meine-daten-2026-10-07/files/forms.json', 'plexora-backup-2026-10-07.zip'])
      expect(ignored(f), f).toBe(true)
  })
  it('normale Projektdateien werden nicht versehentlich ignoriert', () => {
    for (const f of ['scripts/aws/decrypt-backup.mjs', 'scripts/aws/setup-backup.sh', 'shared/backupConfig.json', 'server/utils/backup/crypto.ts']) expect(ignored(f), f).toBe(false)
  })
})
