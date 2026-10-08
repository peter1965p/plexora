#!/usr/bin/env node
// Ende-zu-Ende-Test der Willkommensmail mit Einmal-Link gegen das LIVE-Backend, ohne Browser und ohne echten Kauf:
//   1. ein korrekt signiertes (harmloses) Stripe-Ereignis "checkout.session.completed" für einen Lizenzkauf an den Webhook (Signatur mit dem gespeicherten Webhook-Secret, nur im Speicher)
//   2. die Willkommensmail über die Resend-API lesen (Schlüssel nur im Speicher): Link enthalten, KEIN Passwort, KEIN Lizenzschlüssel
//   3. den Link einlösen (Passwort setzen), zweiten Versuch mit demselben Link abweisen
//   4. Anmeldung mit dem neuen Passwort (SRP) und Konto-Status prüfen
// Legt Test-Daten an (Lizenz, Konto, Token-Zeilen, Mails an die Test-Adresse). Aufräumen macht der Aufrufer danach (siehe Ausgabe). Werte (Token, Passwort, Schlüssel) werden NIE ausgegeben.
//
//   node scripts/security/welcome-flow-test.mjs [test-adresse]      Standard: news24regional+plxtest@gmail.com
import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import Stripe from 'stripe'
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb'
import { reveal, ENC } from './payment-crypto.mjs'

const API = process.env.PLEXORA_API || 'https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com'
const REGION = 'eu-central-1'
export const TOKEN_LINK = /https:\/\/app\.plexora\.eu\/set-password#t=([A-Za-z0-9_-]{43})/

export function buildEvent(email, now = Date.now()) {
  return JSON.stringify({
    id: `evt_plx_welcome_test_${now}`, object: 'event', api_version: '2024-06-20', created: Math.floor(now / 1000), livemode: false, type: 'checkout.session.completed',
    data: { object: { id: `cs_test_plx_welcome_${now}`, object: 'checkout.session', payment_status: 'paid', customer: null, customer_details: { email, name: 'Plexora Testkauf' }, metadata: { type: 'license_purchase', tier: 'starter' } } },
  })
}
export const extractToken = (text) => (String(text).match(TOKEN_LINK) || [])[1] || ''
/** Prüft die Willkommensmail: Link da, nie ein Passwort, nie ein Lizenzschlüssel */
export function checkWelcomeMail({ html = '', text = '' }) {
  const all = `${html}\n${text}`
  return [
    ['Link zum Festlegen des Passworts enthalten (Klartext und HTML)', TOKEN_LINK.test(text) && TOKEN_LINK.test(html)],
    ['kein Passwort in der Mail', !/Temp\.?\s*Passwort|Passwort:|Start-?passwort|Plx[A-Za-z0-9_-]{8,}!1/i.test(all)],
    ['kein Lizenzschlüssel in der Mail', !/PLXR-[0-9A-F]{4}-[0-9A-F]{4}/.test(all)],
    ['Hinweis auf Gültigkeit (60 Minuten, einmalig)', /60 Minuten/.test(all) && /nur einmal/.test(all)],
  ]
}

async function main() {
  const email = (process.argv[2] || 'news24regional+plxtest@gmail.com').toLowerCase()
  const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()
  const db = new DynamoDBClient({ region: REGION })
  const lambdaVar = (name) => sh('aws', ['lambda', 'get-function-configuration', '--region', REGION, '--function-name', 'plexora-api', '--query', `Environment.Variables.${name}`, '--output', 'text'])
  const results = []; const rec = (name, pass, extra = '') => { results.push(pass); console.log(`  ${pass ? 'OK    ' : 'FEHLER'} ${name}${extra ? '  ' + extra : ''}`) }

  const pay = (await db.send(new GetItemCommand({ TableName: 'plexora-settings', Key: { settingId: { S: 'payment' }, scope: { S: 'global' } } }))).Item
  let whsec = pay?.stripeWebhookSecret?.S || ''
  if (ENC.test(whsec)) whsec = reveal(Buffer.from(lambdaVar('NUXT_ENCRYPTION_KEY'), 'base64'), whsec)
  const resendKey = lambdaVar('NUXT_RESEND_API_KEY')
  const started = Date.now()

  console.log(`Willkommens-Test gegen ${API} für ${email.replace(/(.).*(@.*)/, '$1…$2')}`)
  const payload = buildEvent(email)
  const header = new Stripe('sk_test_probe').webhooks.generateTestHeaderString({ payload, secret: whsec, timestamp: Math.floor(Date.now() / 1000) })
  const wh = await fetch(`${API}/api/webhooks/stripe`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': header }, body: payload })
  rec('Webhook nimmt das signierte Kaufereignis an', wh.status === 200, `Status ${wh.status}`)
  if (wh.status !== 200) process.exit(1)

  // Mails an die Test-Adresse (Resend-API, nur lesend)
  const rs = async (path) => (await fetch(`https://api.resend.com${path}`, { headers: { Authorization: `Bearer ${resendKey}` } })).json()
  const findMail = async (subjectPart) => {
    for (let i = 0; i < 24; i++) {
      const list = await rs('/emails?limit=40')
      const m = (list.data || []).find(x => (x.to || []).map(t => String(t).toLowerCase()).includes(email) && String(x.subject).includes(subjectPart) && new Date(x.created_at).getTime() >= started - 5000)
      if (m) return rs(`/emails/${m.id}`)
      await new Promise(r => setTimeout(r, 5000))
    }
    return null
  }
  const mail = await findMail('Willkommen bei Plexora')
  rec('Willkommensmail wurde versendet', !!mail)
  if (!mail) process.exit(1)
  for (const [name, pass] of checkWelcomeMail(mail)) rec(name, pass)
  const token = extractToken(`${mail.text}\n${mail.html}`)
  if (!token) { console.log('Kein Token gefunden – Abbruch.'); process.exit(1) }

  const password = `Tst-${randomBytes(12).toString('base64url')}-9!`
  const post = async (path, body) => { const r = await fetch(`${API}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); let j = {}; try { j = await r.json() } catch {} return { status: r.status, j } }
  const set = await post('/api/auth/set-password', { token, password })
  rec('Passwort per Link gesetzt', set.status === 200 && set.j.success === true, `Status ${set.status}${set.status !== 200 ? ' ' + String(set.j.message || '').slice(0, 90) : ''}`)
  const again = await post('/api/auth/set-password', { token, password: password + 'x' })
  rec('derselbe Link ein zweites Mal wird abgewiesen', again.status === 400, `Status ${again.status}`)
  const second = await findMail('Passwort wurde festgelegt')
  rec('Bestätigungsmail "Passwort festgelegt" (ohne Link)', !!second && !TOKEN_LINK.test(`${second.text}\n${second.html}`))

  // Anmeldung mit dem neuen Passwort (SRP, wie die App)
  const login = spawnSync(process.execPath, ['scripts/aws/demo-login-token.mjs'], { encoding: 'utf8', env: { ...process.env, DEMO_USERNAME: email, DEMO_PASSWORD: password } })
  rec('Anmeldung mit dem neuen Passwort (SRP) klappt', login.status === 0 && login.stdout.trim().split('.').length === 3)
  const st = sh('aws', ['cognito-idp', 'list-users', '--region', REGION, '--user-pool-id', 'eu-central-1_lM7sN6LvC', '--filter', `email = "${email}"`, '--query', 'Users[].[Username,UserStatus,Enabled]', '--output', 'text'])
  console.log(`  --     Konto laut Cognito: ${st.replace(/\s+/g, ' ')}`)
  rec('Konto steht auf CONFIRMED', /\bCONFIRMED\b/.test(st))
  console.log(results.every(Boolean) ? '\nTest bestanden. Jetzt die Test-Daten aufräumen (Konto, Lizenz).' : '\nTest FEHLGESCHLAGEN – Schalter zurücknehmen: scripts/aws/set-enforce.sh welcome off, dann deploy-backend.sh --config-only.')
  process.exit(results.every(Boolean) ? 0 : 1)
}
if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error('Fehler:', e.message); process.exit(1) })
