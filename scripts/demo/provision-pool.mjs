// Legt den Demo-Konten-Pool an (demo01 bis demo10@plexora.eu): Cognito-Konto (Passwort wie das öffentliche Demo-Passwort), Mandant in plexora-nexora und die erste Befüllung aus dem gespeicherten Standard.
// Vorher: das Demo-Konto einrichten und `npx vite-node scripts/demo/snapshot.mjs` ausführen (die Vorlage).
// Aufruf: DEMO_PASSWORD=… npx vite-node scripts/demo/provision-pool.mjs [--apply] [--only=demo03@plexora.eu]
// Vorhandenes wird nicht verändert; ohne --apply wird nur angezeigt.
import { execFileSync } from 'node:child_process'
process.env.AWS_LAMBDA_FUNCTION_NAME = process.env.AWS_LAMBDA_FUNCTION_NAME || 'demo-pool-script'     // lokale AWS-Zugangsdaten statt der App-Variablen
const { DEMO_POOL, DEMO_BASE_EMAIL, demoTenantId, demoSlot } = await import('../../shared/demo')
const { getDynamoClient } = await import('../../server/utils/dynamodb')
const { resetDemo } = await import('../../server/utils/demoSandbox')
const { GetCommand, PutCommand } = await import('@aws-sdk/lib-dynamodb')

const apply = process.argv.includes('--apply'), only = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7)
const POOL_ID = process.env.COGNITO_USER_POOL_ID || 'eu-central-1_lM7sN6LvC', REGION = 'eu-central-1', PW = process.env.DEMO_PASSWORD || ''
if (apply && !PW) { console.error('DEMO_PASSWORD fehlt'); process.exit(2) }
const aws = (...a) => execFileSync('aws', [...a, '--region', REGION], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const exists = (u) => { try { aws('cognito-idp', 'admin-get-user', '--user-pool-id', POOL_ID, '--username', u); return true } catch { return false } }
const db = getDynamoClient()
const base = (await db.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId: demoTenantId(DEMO_BASE_EMAIL) } }))).Item
if (!base) { console.error('Mandant des Ausgangskontos nicht gefunden'); process.exit(1) }

for (const email of DEMO_POOL.filter(e => !only || e === only)) {
  const username = `demo${demoSlot(email)}-plexora`, tenantId = demoTenantId(email)
  if (!exists(username)) {
    console.log(apply ? 'lege an' : 'würde anlegen', 'Cognito-Konto', username, email)
    if (apply) {
      aws('cognito-idp', 'admin-create-user', '--user-pool-id', POOL_ID, '--username', username, '--user-attributes', `Name=email,Value=${email}`, 'Name=email_verified,Value=true', `Name=name,Value=Demo ${demoSlot(email)}`, '--message-action', 'SUPPRESS')
      aws('cognito-idp', 'admin-set-user-password', '--user-pool-id', POOL_ID, '--username', username, '--password', PW, '--permanent')
      aws('cognito-idp', 'admin-add-user-to-group', '--user-pool-id', POOL_ID, '--username', username, '--group-name', 'customers')
    }
  } else console.log('vorhanden: Cognito-Konto', username)
  const have = (await db.send(new GetCommand({ TableName: 'plexora-nexora', Key: { tenantId } }))).Item
  if (!have) {
    const item = { tenantId, email, status: 'active', companyName: `Demo ${demoSlot(email)}`, config: base.config || {}, branchModules: base.branchModules || [], branchPackages: base.branchPackages || [], pages: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), apiKey: 'plx_pub_' + [...crypto.getRandomValues(new Uint8Array(20))].map(b => b.toString(16).padStart(2, '0')).join('') }
    console.log(apply ? 'lege an' : 'würde anlegen', 'Mandant', tenantId)
    if (apply) await db.send(new PutCommand({ TableName: 'plexora-nexora', Item: item }))
  } else console.log('vorhanden: Mandant', tenantId)
  if (apply) console.log('befülle', email, JSON.stringify(await resetDemo({ email, force: true })))
}
