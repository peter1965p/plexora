import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const vue = readFileSync('app/pages/settings/index.vue', 'utf8')
const tab = vue.slice(vue.indexOf("<!-- ── SICHERUNG ── -->"), vue.indexOf('<!-- ── BOT-SCHUTZ'))
const script = vue.slice(vue.indexOf('// ── Sicherung (Gesamtsicherung'), vue.indexOf('// ── Bot-Schutz (Cloudflare Turnstile) ──'))

describe('Tab "Sicherung"', () => {
  it('zeigt die Pflichthinweise: Kundendaten, 7 Tage, Entschlüsseln, Wiederherstellen nur per Kommandozeile mit --dry-run, Verschlüsselungsschlüssel separat aufbewahren', () => {
    for (const t of ['Sicherungen enthalten Kundendaten', 'nicht in ein Git-Repository', 'nicht unverschlüsselt weitergeben', 'nach 7 Tagen automatisch ab', 'decrypt-backup.mjs', 'restore-table.py', '--dry-run', 'NUXT_ENCRYPTION_KEY', 'getrennt von den Sicherungen', 'nicht gespeichert', 'AES-256-GCM'])
      expect(tab, t).toContain(t)
    expect(tab).not.toMatch(/Wiederherstellen<\/button>|@click="restore/i)       // kein Wiederherstellen per Klick
  })
  it('zwei Bereiche: Gesamtsicherung nur für Admins, "Meine Daten exportieren" nur außerhalb des Demo-Zugangs; Hinweis zu Dateien nur über Verweise', () => {
    expect(tab).toMatch(/v-if="isAdmin"[^>]*>[\s\S]*Gesamtsicherung/); expect(tab).toContain('v-if="isDemo"'); expect(tab).toContain('Meine Daten exportieren')
    expect(tab).toContain('nur enthalten, wenn deine Daten darauf verweisen')
  })
  it('Passphrase-Dialog: zweimal, mindestens 12 Zeichen; sie wird nirgends gespeichert oder protokolliert', () => {
    expect(tab).toContain('Passphrase wiederholen'); expect(script).toContain('backupPass.value.length < 12')
    expect(script).not.toMatch(/localStorage|sessionStorage|console\.(log|info|warn|error)/)
    expect(script).toMatch(/closeBackupDialog\(\)[\s\S]*backupPass\.value = ''/)
  })
  it('Status (wartet, läuft mit Fortschritt, fertig, fehlgeschlagen), Größe, Anzahl je Tabelle, Herunterladen, Löschen', () => {
    for (const t of ['wartet', 'läuft', 'fertig', 'fehlgeschlagen']) expect(script).toContain(t)
    for (const t of ['Zählvergleich', 'downloadBackup', 'deleteBackup', 'Letzte Sicherungen']) expect(tab + script).toContain(t)
  })
})
