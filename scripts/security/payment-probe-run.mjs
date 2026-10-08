#!/usr/bin/env node
// Führt scripts/security/stripe-webhook-probe.mjs aus, ohne dass du das Webhook-Secret von Hand eintragen musst:
// Das gespeicherte Secret (Klartext ODER verschlüsselt, je nach Stand der Migration) wird im Speicher gelesen und nur an den Prüfprozess übergeben.
// Es wird nie ausgegeben (die Probe zeigt höchstens die ersten 4 Zeichen). Beweist damit genau, was die Migration nicht verändern darf:
// "das, was der Server aus der Datenbank liest, prüft Signaturen wie vorher".
//
//   node scripts/security/payment-probe-run.mjs vorher --checkout
//   node scripts/security/payment-probe-run.mjs nachher --checkout
// Hinweis: Das beweist NICHT, dass das gespeicherte Secret mit dem im Stripe-Dashboard übereinstimmt (das ist unverändert und war schon vorher so);
// dafür gibt es die Variante mit dem Secret aus dem Dashboard (STRIPE_WEBHOOK_SECRET=… node scripts/security/stripe-webhook-probe.mjs …).
import { execFileSync, spawnSync } from 'node:child_process'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { reveal, ENC } from './payment-crypto.mjs'

const REGION = 'eu-central-1'
const db = new DynamoDBClient({ region: REGION })
const item = (await db.send(new GetItemCommand({ TableName: 'plexora-settings', Key: { settingId: { S: 'payment' }, scope: { S: 'global' } } }))).Item
const stored = item?.stripeWebhookSecret?.S || ''
if (!stored) { console.error('Kein Webhook-Secret gespeichert.'); process.exit(1) }
let secret = stored
if (ENC.test(stored)) {
  const b64 = execFileSync('aws', ['lambda', 'get-function-configuration', '--region', REGION, '--function-name', 'plexora-api', '--query', 'Environment.Variables.NUXT_ENCRYPTION_KEY', '--output', 'text'], { encoding: 'utf8' }).trim()
  secret = reveal(Buffer.from(b64, 'base64'), stored)
}
console.log(`Gespeichertes Webhook-Secret: ${ENC.test(stored) ? 'verschlüsselt' : 'Klartext'}, Länge ${secret.length}`)
const r = spawnSync(process.execPath, ['scripts/security/stripe-webhook-probe.mjs', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, STRIPE_WEBHOOK_SECRET: secret } })
process.exit(r.status ?? 1)
