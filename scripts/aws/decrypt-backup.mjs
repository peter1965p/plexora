#!/usr/bin/env node
// Entschlüsselt eine Plexora-Sicherung (.plxbak) zu einer ZIP-Datei. Ohne Zusatzpakete (nur Node 18+).
//
//   node scripts/aws/decrypt-backup.mjs <datei.plxbak> [ausgabe.zip]
//
// Die Passphrase wird verdeckt abgefragt (oder aus PLX_PASSPHRASE gelesen) und nirgends gespeichert oder ausgegeben.
// Format: "PLXBK1\n" | Salt(16) | N,r,p (je 4 Byte) | IV(12) | Chiffrat | Tag(16); AES-256-GCM, Schlüssel per scrypt; Kopf als AAD.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createDecipheriv, scryptSync } from 'node:crypto'

const [file, out = file.replace(/\.plxbak$/, '') + '.zip'] = process.argv.slice(2)
if (!file) { console.error('Aufruf: node scripts/aws/decrypt-backup.mjs <datei.plxbak> [ausgabe.zip]'); process.exit(2) }
if (existsSync(out)) { console.error(`Die Ausgabedatei existiert schon: ${out}`); process.exit(2) }

function askHidden(prompt) {
  return new Promise((resolve) => {
    if (process.env.PLX_PASSPHRASE) return resolve(process.env.PLX_PASSPHRASE)
    process.stdout.write(prompt)
    const stdin = process.stdin; let buf = ''
    stdin.setRawMode?.(true); stdin.resume(); stdin.setEncoding('utf8')
    stdin.on('data', function onData(ch) {
      for (const c of ch) {
        if (c === '\n' || c === '\r' || c === '\u0004') { stdin.setRawMode?.(false); stdin.pause(); stdin.off('data', onData); process.stdout.write('\n'); return resolve(buf) }
        if (c === '\u0003') process.exit(130)
        if (c === '\u007f') buf = buf.slice(0, -1); else buf += c
      }
    })
  })
}

const data = readFileSync(file)
const MAGIC = Buffer.from('PLXBK1\n', 'ascii'); const headLen = MAGIC.length + 16 + 12 + 12
if (data.length < headLen + 16 || !data.subarray(0, MAGIC.length).equals(MAGIC)) { console.error('Das ist keine Plexora-Sicherungsdatei.'); process.exit(1) }
const salt = data.subarray(MAGIC.length, MAGIC.length + 16)
const N = data.readUInt32BE(MAGIC.length + 16), r = data.readUInt32BE(MAGIC.length + 20), p = data.readUInt32BE(MAGIC.length + 24)
if (N > 1 << 20 || r > 32 || p > 16) { console.error('Ungültige Schlüsselparameter.'); process.exit(1) }
const pass = await askHidden('Passphrase: ')
try {
  const key = scryptSync(Buffer.from(pass.normalize('NFKC'), 'utf8'), salt, 32, { N, r, p, maxmem: 256 * N * r })
  const d = createDecipheriv('aes-256-gcm', key, data.subarray(headLen - 12, headLen))
  d.setAAD(data.subarray(0, headLen)); d.setAuthTag(data.subarray(data.length - 16))
  writeFileSync(out, Buffer.concat([d.update(data.subarray(headLen, data.length - 16)), d.final()]), { mode: 0o600 })
  console.log(`Entschlüsselt: ${out}  (entpacken mit: unzip ${out})`)
} catch { console.error('Entschlüsselung fehlgeschlagen: falsche Passphrase oder beschädigte Datei.'); process.exit(1) }
