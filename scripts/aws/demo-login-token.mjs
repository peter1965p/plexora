// Meldet ein Cognito-Konto per SRP an (der App-Client erlaubt kein USER_PASSWORD_AUTH) und gibt NUR das ID-Token auf stdout aus.
// Benutzername und Passwort kommen aus der Umgebung (DEMO_USERNAME, DEMO_PASSWORD) und werden nie ausgegeben.
import { Amplify } from 'aws-amplify'
import { signIn, signOut, fetchAuthSession } from 'aws-amplify/auth'

const username = process.env.DEMO_USERNAME || 'demo@plexora.eu'
const password = process.env.DEMO_PASSWORD || ''
if (!password) { console.error('DEMO_PASSWORD fehlt'); process.exit(2) }
Amplify.configure({ Auth: { Cognito: {
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'eu-central-1_lM7sN6LvC',
  userPoolClientId: process.env.COGNITO_CLIENT_ID || '1aa9chqqkgr9dp232cgpa4nanb',
} } })
try {
  try { await signOut() } catch {}
  const res = await signIn({ username, password, options: { authFlowType: 'USER_SRP_AUTH' } })
  if (!res.isSignedIn) { console.error('Anmeldung nicht abgeschlossen: ' + (res.nextStep?.signInStep || 'unbekannt')); process.exit(1) }
  const s = await fetchAuthSession()
  const t = s.tokens?.idToken?.toString()
  if (!t) { console.error('Kein ID-Token erhalten'); process.exit(1) }
  process.stdout.write(t)
} catch (e) {
  console.error('Anmeldung fehlgeschlagen: ' + (e?.name || 'Fehler'))
  process.exit(1)
}
