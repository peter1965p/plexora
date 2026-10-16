#!/usr/bin/env node
// Echter Durchlauf gegen die Live-Schnittstelle: Besucher-Konto anlegen, Mail über die Resend-API lesen (Schlüssel nur im Speicher), bestätigen,
// kommentieren, freigeben (direkt in der Datenbank, wie es der Inhaber im Admin tut), Passwort zurücksetzen, abmelden, Konto löschen.
// Räumt alles auf (das Löschen des Kontos entfernt auch den Testkommentar). Gibt keine Schlüssel, Tokens oder Passwörter aus.
//   node scripts/security/visitor-comments-live-test.mjs <mandant> <slug> <testadresse>
import { execFileSync } from 'node:child_process'
const [, , TENANT, SLUG, EMAIL] = process.argv
if (!TENANT || !SLUG || !EMAIL) { console.error('Aufruf: node visitor-comments-live-test.mjs <mandant> <slug> <testadresse>'); process.exit(2) }
const REGION = 'eu-central-1', API = 'https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com', B = `${API}/api/public/${TENANT}`
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim()
const resendKey = sh('aws', ['lambda', 'get-function-configuration', '--region', REGION, '--function-name', 'plexora-api', '--query', 'Environment.Variables.NUXT_RESEND_API_KEY', '--output', 'text'])
const PW1 = 'Test-Schluessel-' + Math.random().toString(36).slice(2, 10) + '-A1', PW2 = 'Neuer-Schluessel-' + Math.random().toString(36).slice(2, 10) + '-B2'
let pass = 0, fail = 0
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? '  (' + extra + ')' : ''}`); return cond }
const post = async (path, body) => { const r = await fetch(`${B}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); let d = {}; try { d = await r.json() } catch {} return { status: r.status, d } }
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function mailToken(since) {
  for (let i = 0; i < 25; i++) {
    const list = (await (await fetch('https://api.resend.com/emails?limit=40', { headers: { Authorization: `Bearer ${resendKey}` } })).json()).data || []
    const m = list.find(x => (x.to || []).map(t => String(t).toLowerCase()).includes(EMAIL.toLowerCase()) && new Date(x.created_at) >= since)
    if (m) { const full = await (await fetch(`https://api.resend.com/emails/${m.id}`, { headers: { Authorization: `Bearer ${resendKey}` } })).json(); const t = /token=([A-Za-z0-9_-]+)/.exec(full.text || full.html || ''); return { token: t && t[1], subject: m.subject, from: m.from, link: /https:\/\/[^\s"<]+\/konto\/[a-z]+\?t=[^\s"<]+/.exec(full.text || '')?.[0]?.replace(/token=.*/, 'token=…') } }
    await sleep(2000)
  }
  return null
}
const get = async (slug) => (await fetch(`${B}/blog/${slug}/comments`)).json()

try {
  const c0 = await get(SLUG); ok('Kommentare sind eingeschaltet', c0.mode === 'moderated' || c0.mode === 'open', 'Modus ' + c0.mode)
  ok('ohne Anmeldung kommentieren: abgelehnt', (await post(`blog/${SLUG}/comments`, { text: 'Ohne Konto' })).status === 401)

  const t0 = new Date(Date.now() - 5000)
  const reg = await post('visitor/register', { name: 'Plexora Test', email: EMAIL, password: PW1 })
  ok('Registrierung angenommen', reg.status === 200, reg.d.message?.slice(0, 40))
  ok('vor der Bestätigung keine Anmeldung', (await post('visitor/login', { email: EMAIL, password: PW1 })).status === 401)
  const acctItem = () => JSON.parse(sh('aws', ['dynamodb', 'get-item', '--region', REGION, '--table-name', 'plexora-site-visitors', '--key', JSON.stringify({ tenantId: { S: TENANT }, sk: { S: `acct#${EMAIL.toLowerCase()}` } }), '--output', 'json'])).Item || {}
  const ttl0 = Number(acctItem().ttl?.N || 0); ok('unbestätigtes Konto läuft nach ca. 7 Tagen automatisch ab', ttl0 > 0 && Math.abs((ttl0 - Date.now() / 1000) / 86400 - 7) < 0.1, ttl0 ? `in ${((ttl0 - Date.now() / 1000) / 86400).toFixed(1)} Tagen` : 'kein Ablauf')
  const m1 = await mailToken(t0)
  ok('Bestätigungsmail angekommen', !!m1?.token, m1 ? `${m1.from} | ${m1.subject}` : 'keine Mail')
  if (m1) console.log('     Link:', m1.link)
  if (!m1?.token) throw new Error('keine Mail')

  const ver = await post('visitor/verify', { token: m1.token })
  ok('Bestätigung klappt, danach angemeldet', ver.status === 200 && ver.d.token?.length > 30)
  ok('nach der Bestätigung kein Ablauf mehr', acctItem().ttl === undefined && acctItem().verified?.BOOL === true)
  ok('Bestätigungslink nur einmal gültig', (await post('visitor/verify', { token: m1.token })).status === 400)
  let session = ver.d.token
  ok('Sitzung gültig (me)', (await post('visitor/me', { token: session })).status === 200)

  const cm = await post(`blog/${SLUG}/comments`, { token: session, text: 'Das ist ein automatischer Test von Plexora. Bitte ignorieren.' })
  ok('Kommentar angenommen', cm.status === 200, `Status: ${cm.d.status}`)
  const visible0 = (await get(SLUG)).comments.length
  if (cm.d.status === 'pending') {
    ok('wartet auf Freigabe: öffentlich noch NICHT sichtbar', !(await get(SLUG)).comments.some(c => /automatischer Test/.test(c.text)))
    const rows = JSON.parse(sh('aws', ['dynamodb', 'query', '--region', REGION, '--table-name', 'plexora-blog-comments', '--key-condition-expression', 'tenantId = :t', '--expression-attribute-values', JSON.stringify({ ':t': { S: TENANT } }), '--output', 'json'])).Items || []
    const mine = rows.find(r => r.authorEmail?.S === EMAIL.toLowerCase() && r.status?.S === 'pending')
    ok('Kommentar in der Verwaltung gefunden (Status "wartet")', !!mine)
    if (mine) sh('aws', ['dynamodb', 'update-item', '--region', REGION, '--table-name', 'plexora-blog-comments', '--key', JSON.stringify({ tenantId: { S: TENANT }, commentId: { S: mine.commentId.S } }), '--update-expression', 'SET #s = :a', '--expression-attribute-names', '{"#s":"status"}', '--expression-attribute-values', '{":a":{"S":"approved"}}'])
  }
  const after = await get(SLUG), shown = after.comments.find(c => /automatischer Test/.test(c.text))
  ok('freigegeben: öffentlich sichtbar, nur Name/Text/Zeit', !!shown && !JSON.stringify(shown).includes(EMAIL) && Object.keys(shown).sort().join() === 'commentId,created,name,text', shown ? `Name: ${shown.name}` : '')
  ok('zweiter Kommentar sofort: gebremst', (await post(`blog/${SLUG}/comments`, { token: session, text: 'Gleich nochmal' })).status === 429)

  const t1 = new Date(Date.now() - 2000)
  const fg = await post('visitor/forgot', { email: EMAIL }); ok('Passwort vergessen: Antwort', fg.status === 200)
  const m2 = await mailToken(t1); ok('Reset-Mail angekommen', !!m2?.token && /passwort/.test(m2?.link || ''))
  if (m2?.token) {
    ok('zu schwaches neues Passwort wird abgelehnt (Link bleibt gültig)', (await post('visitor/reset', { token: m2.token, password: 'kurz' })).status === 400)
    ok('neues Passwort gesetzt', (await post('visitor/reset', { token: m2.token, password: PW2 })).status === 200)
    ok('Reset-Link nur einmal gültig', (await post('visitor/reset', { token: m2.token, password: PW2 + 'x' })).status === 400)
    ok('alte Sitzung beendet', (await post('visitor/me', { token: session })).status === 401)
    ok('altes Passwort geht nicht mehr', (await post('visitor/login', { email: EMAIL, password: PW1 })).status === 401)
    const lg = await post('visitor/login', { email: EMAIL, password: PW2 }); ok('Anmeldung mit neuem Passwort', lg.status === 200); session = lg.d.token
  }
  ok('Abmelden', (await post('visitor/logout', { token: session })).status === 200)
  ok('danach ist die Sitzung ungültig', (await post('visitor/me', { token: session })).status === 401)
  const lg2 = await post('visitor/login', { email: EMAIL, password: PW2 }); session = lg2.d.token
} catch (e) { fail++; console.log('FEHL Abbruch:', e.message) }
finally {
  // Aufräumen: Konto samt Kommentar über die normale Löschfunktion; falls das nicht ging, direkt in der Datenbank
  try {
    const lg = await post('visitor/login', { email: EMAIL, password: PW2 }), lg1 = lg.status === 200 ? lg : await post('visitor/login', { email: EMAIL, password: PW1 })
    if (lg1.status === 200) { const del = await post('visitor/delete-account', { token: lg1.d.token, confirm: 'LOESCHEN' }); ok('Konto löschen (inklusive Testkommentar)', del.status === 200, `${del.d.deletedComments} Kommentar(e) entfernt`) }
    else { sh('aws', ['dynamodb', 'delete-item', '--region', REGION, '--table-name', 'plexora-site-visitors', '--key', JSON.stringify({ tenantId: { S: TENANT }, sk: { S: `acct#${EMAIL.toLowerCase()}` } })]); console.log('INFO Konto direkt in der Datenbank entfernt') }
  } catch (e) { console.log('WARN Aufräumen:', e.message) }
  const left = (await get(SLUG)).comments.filter(c => /automatischer Test/.test(c.text)).length
  ok('nichts bleibt zurück (kein Testkommentar öffentlich)', left === 0)
  console.log(`\n${pass} bestanden, ${fail} fehlgeschlagen`)
  process.exit(fail ? 1 : 0)
}
