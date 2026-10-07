#!/usr/bin/env node
// Bereinigt bestehende Einträge im Versand-Protokoll (plexora-mail-log): Links werden auf den Host gekürzt, UUIDs und lange Zufallswerte ersetzt.
// Dieselbe Logik wie shared/logMask.ts (ein Test erzwingt, dass beide gleich arbeiten).
//
//   node scripts/security/mask-mail-log.mjs                 PROBELAUF (Standard): zeigt nur Zahlen und die maskierte Fassung, ändert nichts
//   node scripts/security/mask-mail-log.mjs --apply         schreibt die maskierten Vorschauen zurück (legt vorher IMMER einen Export an)
//   --export-dir <Ordner>   wohin der Export vor dem Ändern geschrieben wird (Standard: ~/Dev/backups/plexora/mail-log)
//
// Es wird nur das Feld "preview" (und bei Treffern "subject") geändert, nie ein Eintrag angelegt oder gelöscht. Es werden keine unmaskierten Werte ausgegeben.
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"')\]]+/gi
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const LONG_TOKEN_RE = /\b(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{24,}\b/g
export function maskLogText(text) {
  return String(text ?? '')
    .replace(URL_RE, (m) => { const tail = (m.match(/[.,;:!?]+$/) || [''])[0]; const u = tail ? m.slice(0, -tail.length) : m; try { const x = new URL(/^www\./i.test(u) ? `https://${u}` : u); return `${x.protocol}//${x.host}/…${tail}` } catch { return `[Link]${tail}` } })
    .replace(UUID_RE, '[…]')
    .replace(LONG_TOKEN_RE, '[…]')
}

async function main() {
  const args = process.argv.slice(2)
  const apply = args.includes('--apply')
  const dirArg = args.indexOf('--export-dir')
  const dir = dirArg >= 0 ? args[dirArg + 1] : join(homedir(), 'Dev', 'backups', 'plexora', 'mail-log')
  const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-central-1' }))

  const items = []
  let key
  do { const r = await db.send(new ScanCommand({ TableName: 'plexora-mail-log', ExclusiveStartKey: key })); items.push(...(r.Items || [])); key = r.LastEvaluatedKey } while (key)
  const changes = items.map((it) => ({ it, preview: maskLogText(it.preview), subject: maskLogText(it.subject) })).filter(c => c.preview !== (c.it.preview ?? '') || c.subject !== (c.it.subject ?? ''))
  console.log(`${apply ? 'ANWENDEN' : 'PROBELAUF'}: ${items.length} Einträge gelesen, ${changes.length} würden geändert.`)
  for (const c of changes) console.log(`  ${String(c.it.kind).padEnd(20)} ${String(c.it.mailId).slice(0, 8)}…  neu: ${c.preview.slice(0, 110).replace(/\s+/g, ' ')}`)
  if (!apply) { console.log('\n(Probelauf: nichts geändert. Mit --apply ausführen, nachdem du die Liste geprüft hast.)'); return }
  if (!changes.length) return

  mkdirSync(dir, { recursive: true, mode: 0o700 })
  const file = join(dir, `plexora-mail-log-vor-maskierung-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(file, JSON.stringify(items, null, 2), { mode: 0o600 })
  if (!existsSync(file)) throw new Error('Export konnte nicht geschrieben werden – es wird nichts geändert.')
  console.log(`Export vor dem Ändern: ${file}`)
  let n = 0
  for (const c of changes) {
    await db.send(new UpdateCommand({ TableName: 'plexora-mail-log', Key: { userId: c.it.userId, mailId: c.it.mailId }, UpdateExpression: 'SET preview = :p, subject = :s', ConditionExpression: 'attribute_exists(mailId)', ExpressionAttributeValues: { ':p': c.preview, ':s': c.subject } }))
    n++
  }
  console.log(`${n} Einträge maskiert.`)
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('Fehler:', e.message); process.exit(1) })
