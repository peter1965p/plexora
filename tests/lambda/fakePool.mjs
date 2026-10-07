// Fake für Cognito: ein User Pool mit Nutzern; versteht die vier Befehle, die der Pre-Sign-up-Trigger benutzt.
export const pool = { users: [], links: [], deleted: [], updated: [], failList: false }
export const resetPool = () => { pool.users = []; pool.links = []; pool.deleted = []; pool.updated = []; pool.failList = false }
export const addUser = (u) => { pool.users.push({ Enabled: true, Attributes: [], ...u, Attributes: Object.entries(u.attrs || {}).map(([Name, Value]) => ({ Name, Value })) }); return u.Username }
export const handleSend = async (cmd) => {
  const n = cmd.constructor.name, i = cmd.input
  if (n === 'ListUsersCommand') {
    if (pool.failList) throw new Error('Cognito nicht erreichbar')
    const m = /^email\s*=\s*"((?:[^"\\]|\\.)*)"$/.exec(i.Filter || ''); if (!m) throw new Error('InvalidParameterException: Filter ungültig')
    return { Users: pool.users.filter(u => u.Attributes.find(a => a.Name === 'email')?.Value === m[1]).map(({ attrs, ...u }) => u) }
  }
  if (n === 'AdminLinkProviderForUserCommand') { pool.links.push(i); return {} }
  if (n === 'AdminUpdateUserAttributesCommand') { pool.updated.push(i); return {} }
  if (n === 'AdminDeleteUserCommand') { pool.deleted.push(i.Username); pool.users = pool.users.filter(u => u.Username !== i.Username); return {} }
  throw new Error('unerwarteter Befehl ' + n)
}
export const googleEvent = (email, over = {}) => ({
  triggerSource: 'PreSignUp_ExternalProvider', userPoolId: 'pool', userName: 'Google_1234567890',
  request: { userAttributes: { email, email_verified: 'true', picture: 'https://pic.example/p.png', ...over } }, response: {},
})
export const nativeEvent = (email) => ({ triggerSource: 'PreSignUp_SignUp', userPoolId: 'pool', userName: 'neu', request: { userAttributes: { email } }, response: {} })
