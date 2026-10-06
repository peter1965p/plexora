import { describe, it, expect, vi } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deriveBackupKey, encryptBackup, decryptBackup, validatePassphrase, BackupDecryptError, MIN_PASSPHRASE } from '../../server/utils/backup/crypto'

const PASS = 'Correct-Horse-Battery-Staple-42'
const DATA = Buffer.from(JSON.stringify({ kontakte: [{ name: 'Max Mustermann' }], n: 1 }))

describe('Sicherungsdatei: AES-256-GCM, Schlüssel per scrypt', () => {
  it('mit der richtigen Passphrase kommen dieselben Daten heraus', () => {
    const { key, params } = deriveBackupKey(PASS)
    const file = encryptBackup(DATA, key, params)
    expect(file.includes(Buffer.from('Mustermann'))).toBe(false)          // Klartext steht nicht in der Datei
    expect(decryptBackup(file, PASS).equals(DATA)).toBe(true)
  })
  it('mit falscher Passphrase, manipulierten Daten oder gekürzter Datei scheitert die Entschlüsselung', () => {
    const { key, params } = deriveBackupKey(PASS)
    const file = encryptBackup(DATA, key, params)
    expect(() => decryptBackup(file, PASS + 'x')).toThrow(BackupDecryptError)
    const flipped = Buffer.from(file); flipped[flipped.length - 20] ^= 1
    expect(() => decryptBackup(flipped, PASS)).toThrow(BackupDecryptError)
    const headFlip = Buffer.from(file); headFlip[10] ^= 1                  // Kopf (Salt) ist an das Chiffrat gebunden
    expect(() => decryptBackup(headFlip, PASS)).toThrow(BackupDecryptError)
    expect(() => decryptBackup(file.subarray(0, 40), PASS)).toThrow(BackupDecryptError)
    expect(() => decryptBackup(Buffer.from('kein Archiv'), PASS)).toThrow(BackupDecryptError)
  })
  it('zwei Sicherungen mit derselben Passphrase unterscheiden sich (Salt und IV sind zufällig)', () => {
    const a = deriveBackupKey(PASS); const b = deriveBackupKey(PASS)
    expect(encryptBackup(DATA, a.key, a.params).equals(encryptBackup(DATA, b.key, b.params))).toBe(false)
    expect(a.key.equals(b.key)).toBe(false)
  })
  it('Passphrase-Regeln: mindestens 12 Zeichen, beide Eingaben gleich', () => {
    expect(validatePassphrase('kurz', 'kurz')).toMatch(String(MIN_PASSPHRASE))
    expect(validatePassphrase('x'.repeat(300))).toMatch(/höchstens/)
    expect(validatePassphrase(PASS, 'anders')).toMatch(/stimmen nicht/)
    expect(validatePassphrase(undefined)).not.toBeNull()
    expect(validatePassphrase(PASS, PASS)).toBeNull()
  })
  it('das mitgelieferte Entschlüsselungs-Skript (reines Node) liest die Datei des Servers', () => {
    const dir = mkdtempSync(join(tmpdir(), 'plxbak-'))
    const { key, params } = deriveBackupKey(PASS)
    writeFileSync(join(dir, 'test.plxbak'), encryptBackup(DATA, key, params))
    execFileSync('node', ['scripts/aws/decrypt-backup.mjs', join(dir, 'test.plxbak'), join(dir, 'out.zip')], { env: { ...process.env, PLX_PASSPHRASE: PASS } })
    expect(readFileSync(join(dir, 'out.zip')).equals(DATA)).toBe(true)
    expect(() => execFileSync('node', ['scripts/aws/decrypt-backup.mjs', join(dir, 'test.plxbak'), join(dir, 'out2.zip')], { env: { ...process.env, PLX_PASSPHRASE: 'falsch-falsch-falsch' }, stdio: 'pipe' })).toThrow()
  })
  it('die Passphrase taucht in keiner Ausgabe der Funktionen auf', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {}); const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { key, params } = deriveBackupKey(PASS); const file = encryptBackup(DATA, key, params)
    let msg = ''; try { decryptBackup(file, 'falsch-falsch-falsch') } catch (e: any) { msg = e.message }
    expect(msg).not.toContain('falsch-falsch'); expect(msg).not.toContain(PASS)
    expect(JSON.stringify([...spy.mock.calls, ...err.mock.calls])).not.toContain(PASS)
    spy.mockRestore(); err.mockRestore()
  })
})
