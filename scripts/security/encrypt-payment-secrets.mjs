#!/usr/bin/env node
// Verschlüsselt die Zahlungs-Schlüssel in plexora-settings (payment/global) mit AES-256-GCM (dasselbe Format wie server/utils/crypto.ts).
//
//   node scripts/security/encrypt-payment-secrets.mjs --dry-run              zeigt, welche Felder verschlüsselt würden (nur Namen/Länge, nie Werte)
//   node scripts/security/encrypt-payment-secrets.mjs --apply                Export der Zeile, Verschlüsseln, Zurücklesen und Prüfen
//   node scripts/security/encrypt-payment-secrets.mjs --rollback <Export>    stellt die Zeile aus dem Export wieder her (Klartext!)
//
// REIHENFOLGE: Erst das Backend mit server/utils/paymentSecrets.ts ausliefern (liest Klartext UND verschlüsselt), danach --apply.
// Das Skript bricht ab, wenn die live-Version den Code noch nicht enthält. Den Schlüssel NUXT_ENCRYPTION_KEY liest es nur im Speicher
// aus der Lambda-Konfiguration; weder er noch Werte werden ausgegeben. Der Export liegt unter /home/peter/Dev/backups/plexora/ (Rechte 600) –
// er enthält die Klartext-Werte und ist nach erfolgreichem Test sicher zu löschen (shred).
import { execFileSync } from 'node:child_process'
import { seal, reveal, ENC } from './payment-crypto.mjs'
import { writeFileSync, readFileSync, mkdirSync, chmodSync } from 'node:fs'
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb'

const REGION = 'eu-central-1'
const FIELDS = ['stripeSecretKey', 'stripeWebhookSecret', 'paypalSecret', 'mollieApiKey', 'customApiKey']
const KEY_ITEM = { settingId: { S: 'payment' }, scope: { S: 'global' } }
const mode = process.argv[2] || '--dry-run'
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()
const db = new DynamoDBClient({ region: REGION })

function encKey() {
  const b64 = sh('aws', ['lambda', 'get-function-configuration', '--region', REGION, '--function-name', 'plexora-api', '--query', 'Environment.Variables.NUXT_ENCRYPTION_KEY', '--output', 'text'])
  const key = Buffer.from(b64, 'base64')
  if (key.length !== 32) throw new Error('NUXT_ENCRYPTION_KEY aus der Lambda ist kein 32-Byte-Schlüssel')
  return key
}
async function load() { return (await db.send(new GetItemCommand({ TableName: 'plexora-settings', Key: KEY_ITEM }))).Item }

if (mode === '--rollback') {
  const file = process.argv[3]; if (!file) { console.error('Export-Datei angeben'); process.exit(2) }
  const item = JSON.parse(readFileSync(file, 'utf8'))
  await db.send(new PutItemCommand({ TableName: 'plexora-settings', Item: item }))
  console.log('Zeile aus dem Export wiederhergestellt (Klartext-Werte sind zurück).'); process.exit(0)
}

const item = await load()
if (!item) { console.log('Keine payment-Einstellung vorhanden – nichts zu tun.'); process.exit(0) }
const plan = FIELDS.map(f => ({ f, set: !!item[f]?.S, enc: ENC.test(item[f]?.S || ''), len: (item[f]?.S || '').length }))
console.log('Zahlungs-Einstellungen (nur Zustand, keine Werte):')
for (const p of plan) console.log(`  ${p.f.padEnd(22)} ${p.set ? (p.enc ? 'bereits verschlüsselt' : `Klartext, Länge ${p.len} -> wird verschlüsselt`) : 'leer'}`)
const todo = plan.filter(p => p.set && !p.enc)
if (!todo.length) { console.log('Nichts zu verschlüsseln.'); process.exit(0) }
if (mode !== '--apply') { console.log('(Probelauf: nichts geändert)'); process.exit(0) }

// Sicherung: die live-Version muss paymentSecrets.ts enthalten, sonst würde Checkout/Webhook den verschlüsselten Wert nicht lesen
const live = sh('aws', ['lambda', 'get-alias', '--region', REGION, '--function-name', 'plexora-api', '--name', 'live', '--query', 'Description', '--output', 'text']).split(/\s+/)[0].replace(/\+uncommitted$/, '')
const need = sh('git', ['log', '--format=%h', '-1', '--', 'server/utils/paymentSecrets.ts'])
if (!need) { console.error('server/utils/paymentSecrets.ts ist nicht eingecheckt – Abbruch'); process.exit(1) }
try { execFileSync('git', ['merge-base', '--is-ancestor', need, live], { stdio: 'ignore' }) }
catch { console.error(`ABBRUCH: Die live-Version (${live}) enthält den Entschlüsselungs-Code (${need}) noch nicht. Erst deployen: scripts/aws/deploy-backend.sh`); process.exit(1) }

const key = encKey()
const dir = '/home/peter/Dev/backups/plexora'; mkdirSync(dir, { recursive: true, mode: 0o700 })
const exportFile = `${dir}/payment-secrets-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
writeFileSync(exportFile, JSON.stringify(item), { mode: 0o600 }); chmodSync(exportFile, 0o600)
console.log(`Export vor der Änderung (Klartext, Rechte 600): ${exportFile}`)

const next = { ...item }
for (const p of todo) next[p.f] = { S: seal(key, item[p.f].S) }
next.updated = { S: new Date().toISOString() }
await db.send(new PutItemCommand({ TableName: 'plexora-settings', Item: next }))

// Zurücklesen und prüfen: jedes Feld entschlüsselt zum ursprünglichen Wert (Vergleich im Speicher)
const after = await load(); let ok = true
for (const p of todo) {
  const same = ENC.test(after[p.f].S) && reveal(key, after[p.f].S) === item[p.f].S
  console.log(`  ${p.f.padEnd(22)} ${same ? 'verschlüsselt, Probe-Entschlüsselung stimmt' : 'FEHLER'}`); ok = ok && same
}
if (!ok) { await db.send(new PutItemCommand({ TableName: 'plexora-settings', Item: item })); console.error('Prüfung fehlgeschlagen – Zeile wurde automatisch aus dem Export zurückgesetzt.'); process.exit(1) }
console.log(`Fertig. Rückweg: node scripts/security/encrypt-payment-secrets.mjs --rollback ${exportFile}`)
console.log('Danach Checkout und Webhook einmal testen; anschließend den Export sicher löschen: shred -u <Datei>')
