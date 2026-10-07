import { CognitoIdentityProviderClient, ListUsersCommand, AdminSetUserPasswordCommand } from '@aws-sdk/client-cognito-identity-provider'

// Konten, die auf ihr erstes Passwort warten (Status FORCE_CHANGE_PASSWORD, angelegt nach einem Kauf), und das Festlegen des Passworts.
// ListUsers darf die API schon heute; AdminSetUserPassword braucht ein eigenes Recht (scripts/aws/grant-set-password-right.sh).
const SAFE_EMAIL = /^[^\s"'\\<>(),;:]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}$/
const SAFE_USERNAME = /^[A-Za-z0-9_.@+-]{1,128}$/
export const isSafeEmail = (s: string) => SAFE_EMAIL.test(s)
export const isSafeUsername = (s: string) => SAFE_USERNAME.test(s)

const poolId = () => String(((useRuntimeConfig().public as any)?.awsUserPoolId) || 'eu-central-1_lM7sN6LvC')
const client = () => new CognitoIdentityProviderClient({ region: 'eu-central-1' })

export interface PendingUser { username: string; email: string; status: string; enabled: boolean }
const toUser = (u: any): PendingUser => ({ username: String(u.Username), email: String(u.Attributes?.find((a: any) => a.Name === 'email')?.Value || ''), status: String(u.UserStatus || ''), enabled: u.Enabled !== false })

/** Das eine Konto mit dieser E-Mail, das auf sein erstes Passwort wartet (sonst null; mehrdeutig = null) */
export async function findPendingByEmail(email: string): Promise<PendingUser | null> {
  if (!isSafeEmail(email)) return null
  const res = await client().send(new ListUsersCommand({ UserPoolId: poolId(), Filter: `email = "${email}"`, Limit: 10 }))
  const users = (res.Users || []).map(toUser).filter(u => u.enabled && !u.username.toLowerCase().startsWith('google_'))
  const pending = users.filter(u => u.status === 'FORCE_CHANGE_PASSWORD')
  return pending.length === 1 && users.length === pending.length ? pending[0] : null
}

export async function getUserStatus(username: string): Promise<PendingUser | null> {
  if (!isSafeUsername(username)) return null
  const res = await client().send(new ListUsersCommand({ UserPoolId: poolId(), Filter: `username = "${username}"`, Limit: 2 }))
  return res.Users?.length === 1 ? toUser(res.Users[0]) : null
}

export async function setPermanentPassword(username: string, password: string): Promise<void> {
  await client().send(new AdminSetUserPasswordCommand({ UserPoolId: poolId(), Username: username, Password: password, Permanent: true }))
}
