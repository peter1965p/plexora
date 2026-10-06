import { createCipheriv, createDecipheriv, randomBytes, scryptSync, createHash } from 'node:crypto'

// Verschlüsselte Sicherungsdatei: AES-256-GCM, Schlüssel per scrypt aus der Passphrase.
// Aufbau: "PLXBK1\n" | Salt (16) | N, r, p (je 4 Byte) | IV (12) | Chiffrat | Auth-Tag (16). Der Kopf (bis einschließlich IV) ist als AAD an das Chiffrat gebunden.
// Die Passphrase wird nie gespeichert oder protokolliert; auf dem Server entsteht nur der abgeleitete Schlüssel.
export const MAGIC = Buffer.from('PLXBK1\n', 'ascii')
export const SCRYPT = { N: 1 << 15, r: 8, p: 1 }
export const MIN_PASSPHRASE = 12
export const MAX_PASSPHRASE = 256

export interface KeyParams { salt: Buffer; N: number; r: number; p: number }

export function validatePassphrase(pass: unknown, confirm?: unknown): string | null {
  if (typeof pass !== 'string' || pass.length < MIN_PASSPHRASE) return `Die Passphrase muss mindestens ${MIN_PASSPHRASE} Zeichen lang sein.`
  if (pass.length > MAX_PASSPHRASE) return `Die Passphrase darf höchstens ${MAX_PASSPHRASE} Zeichen lang sein.`
  if (confirm !== undefined && pass !== confirm) return 'Die beiden Eingaben der Passphrase stimmen nicht überein.'
  return null
}

const derive = (pass: string, p: KeyParams) => scryptSync(Buffer.from(pass.normalize('NFKC'), 'utf8'), p.salt, 32, { N: p.N, r: p.r, p: p.p, maxmem: 256 * p.N * p.r })

export function deriveBackupKey(passphrase: string): { key: Buffer; params: KeyParams } {
  const params: KeyParams = { salt: randomBytes(16), ...SCRYPT }
  return { key: derive(passphrase, params), params }
}

function header(params: KeyParams, iv: Buffer): Buffer {
  const nrp = Buffer.alloc(12); nrp.writeUInt32BE(params.N, 0); nrp.writeUInt32BE(params.r, 4); nrp.writeUInt32BE(params.p, 8)
  return Buffer.concat([MAGIC, params.salt, nrp, iv])
}

export function encryptBackup(plain: Buffer, key: Buffer, params: KeyParams): Buffer {
  const iv = randomBytes(12); const head = header(params, iv)
  const c = createCipheriv('aes-256-gcm', key, iv); c.setAAD(head)
  return Buffer.concat([head, c.update(plain), c.final(), c.getAuthTag()])
}

export class BackupDecryptError extends Error {}

export function decryptBackup(file: Buffer, passphrase: string): Buffer {
  const headLen = MAGIC.length + 16 + 12 + 12
  if (file.length < headLen + 16 || !file.subarray(0, MAGIC.length).equals(MAGIC)) throw new BackupDecryptError('Keine Plexora-Sicherungsdatei')
  const salt = file.subarray(MAGIC.length, MAGIC.length + 16)
  const nrp = file.subarray(MAGIC.length + 16, MAGIC.length + 28)
  const params: KeyParams = { salt, N: nrp.readUInt32BE(0), r: nrp.readUInt32BE(4), p: nrp.readUInt32BE(8) }
  if (params.N > 1 << 20 || params.r > 32 || params.p > 16) throw new BackupDecryptError('Ungültige Schlüsselparameter')
  const iv = file.subarray(headLen - 12, headLen)
  try {
    const d = createDecipheriv('aes-256-gcm', derive(passphrase, params), iv)
    d.setAAD(file.subarray(0, headLen)); d.setAuthTag(file.subarray(file.length - 16))
    return Buffer.concat([d.update(file.subarray(headLen, file.length - 16)), d.final()])
  } catch { throw new BackupDecryptError('Entschlüsselung fehlgeschlagen: falsche Passphrase oder beschädigte Datei') }
}

export const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex')
