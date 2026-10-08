import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServer, type Server } from 'node:http'
import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import WebSocket from 'ws'
import { db, cloudflare, fakeDynamo, installGlobals, resetDb, resolveUserIdFake } from '../botprotection/helpers'

// Ende-zu-Ende: ECHTE Buchungsseite (nexora-nuxt, /termine?type=…) im echten Browser gegen die ECHTEN Server-Handler (termine, availability, book) mit gefälschter Datenbank.
// Der Browser rendert die Seite, wählt Zeit, füllt das Formular, wartet (falls ein Widget da ist) auf das Cloudflare-Token (Test-Sitekey, besteht immer) und sendet ab.
// Nichts wird gebucht: die "Datenbank" liegt im Arbeitsspeicher, es gibt keinen Kalender, keine Mail. Alles andere (Branding usw.) wird nur lesend an die Live-API durchgereicht.
const REAL_FETCH = globalThis.fetch
vi.mock('../../server/utils/dynamodb', () => ({ getDynamoClient: () => fakeDynamo() }))
vi.mock('../../server/utils/tenant', () => ({ resolveUserId: (e: string) => resolveUserIdFake(e) }))
vi.mock('../../server/utils/automations', () => ({ fireAutomations: () => {} }))
vi.mock('../../server/utils/sequences', () => ({ startSequences: async () => {} }))
vi.mock('../../server/utils/campaignAppointments', () => ({ findCampaignAppointmentTypeId: async () => '' }))
vi.mock('../../server/utils/mailer', () => ({ sendMail: async () => 'sent' }))
vi.mock('../../server/utils/termine', async (orig) => ({ ...(await orig() as any), computeFreeSlots: async () => ['10:00'], createGoogleCalendarEvent: async () => null }))
installGlobals()

const { default: termineGet } = await import('../../server/api/public/[tenantId]/termine.get')
const { default: availability } = await import('../../server/api/public/[tenantId]/termine/availability.get')
const { default: book } = await import('../../server/api/public/[tenantId]/termine/book.post')
const { encryptSecret } = await import('../../server/utils/crypto')

const NEXORA_DIR = '/home/peter/Dev/nexora-nuxt', BRAVE = '/usr/bin/brave'
const TENANT = 'PLXR-GOD0-MODE-0000-PETE', OWNER = 'chef@firma.de'
const API_PORT = 4010, WEB_PORT = 3123, CDP_PORT = 9333
const TEST_SITEKEY = '1x00000000000000000000AA'          // Cloudflare-Testschlüssel: besteht immer, Token "XXXX.DUMMY.TOKEN.XXXX"
const log: { method: string; path: string; body: any; status: number; reply?: any }[] = []
let apiServer: Server, web: ChildProcess

const setup = (protectedOn: boolean) => {
  resetDb()
  cloudflare.respond = (secret, token) => secret === 'good-secret-123' && token.startsWith('XXXX.DUMMY') ? { success: true, hostname: 'localhost' } : { success: false, 'error-codes': ['invalid-input-response'] }
  db.settings.set(`bot-protection|${OWNER}`, { settingId: 'bot-protection', scope: OWNER, enabled: true, siteKey: TEST_SITEKEY, mode: 'managed', secretEncrypted: encryptSecret('good-secret-123'), secretMasked: '', contactProtection: false, hostnames: [] })
  db.campaigns = [{ userId: OWNER, campaignId: 'c1', slug: 'e2e', formId: 'f1', turnstileEnabled: protectedOn, appointmentTypeId: 'ty1' }]
  db.nexora = [{ tenantId: TENANT, email: OWNER, status: 'active', termineEnabled: true, customDomain: 'localhost', companyName: 'E2E Testfirma' }]
  db.types = [{ tenantId: TENANT, typeId: 'ty1', name: 'Kampagnen-Beratung', active: true, campaignId: 'c1', durationMinutes: 30 }]
  log.length = 0
}

async function startApi() {
  apiServer = createServer(async (req, res) => {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' }
    const url = new URL(req.url || '/', `http://localhost:${API_PORT}`)
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end() }
    const chunks: Buffer[] = []; for await (const c of req) chunks.push(c as Buffer)
    const raw = Buffer.concat(chunks).toString('utf8'); let body: any; try { body = raw ? JSON.parse(raw) : undefined } catch { body = undefined }
    const base = `/api/public/${TENANT}/termine`
    const handler = url.pathname === base && req.method === 'GET' ? termineGet : url.pathname === `${base}/availability` ? availability : url.pathname === `${base}/book` && req.method === 'POST' ? book : null
    if (!handler) {       // alles andere (Branding, Inhalte …): nur lesend an die Live-API
      if (req.method !== 'GET') { res.writeHead(405, cors); return res.end() }
      try { const r = await REAL_FETCH(`https://7hrkm580pb.execute-api.eu-central-1.amazonaws.com${url.pathname}${url.search}`); res.writeHead(r.status, { ...cors, 'Content-Type': r.headers.get('content-type') || 'application/json' }); return res.end(Buffer.from(await r.arrayBuffer())) } catch { res.writeHead(502, cors); return res.end() }
    }
    const query = Object.fromEntries(url.searchParams)
    let status = 200, reply: any
    try { reply = await (handler as any)({ headers: { 'x-forwarded-for': `203.0.113.${Math.floor(Math.random() * 250)}` }, params: { tenantId: TENANT }, query, body, method: req.method }) }
    catch (e: any) { status = e.statusCode || 500; reply = { statusCode: status, message: e.message } }
    if (handler === book || handler === termineGet) log.push({ method: req.method!, path: url.pathname + url.search, body, status, reply: handler === termineGet ? { botProtection: !!reply?.botProtection } : undefined })
    res.writeHead(status, { ...cors, 'Content-Type': 'application/json' }); res.end(JSON.stringify(reply))
  })
  await new Promise<void>(r => apiServer.listen(API_PORT, '127.0.0.1', r))
}

async function startWeb() {
  web = spawn('npx', ['nuxt', 'dev', '--port', String(WEB_PORT), '--host', '127.0.0.1'], { cwd: NEXORA_DIR, env: { ...process.env, NUXT_PUBLIC_PLEXORA_API_URL: `http://127.0.0.1:${API_PORT}`, NUXT_TELEMETRY_DISABLED: '1', CI: '1' }, stdio: 'ignore', detached: true })     // eigene Prozessgruppe: beim Aufräumen wird auch das Kind von npx beendet
  const t0 = Date.now()
  while (Date.now() - t0 < 180_000) { try { const r = await REAL_FETCH(`http://127.0.0.1:${WEB_PORT}/termine`); if (r.status === 200) return } catch {} ; await new Promise(r => setTimeout(r, 1500)) }
  throw new Error('nexora-nuxt Dev-Server startete nicht')
}

// ── minimaler Chrome-DevTools-Client ──
class Cdp {
  private id = 0; private pending = new Map<number, (v: any) => void>(); ws!: WebSocket
  static async connect(port: number) {
    for (let i = 0; i < 60; i++) { try { const list: any[] = await (await REAL_FETCH(`http://127.0.0.1:${port}/json`)).json(); const page = list.find(x => x.type === 'page'); if (page) { const c = new Cdp(); await c.open(page.webSocketDebuggerUrl); return c } } catch {} ; await new Promise(r => setTimeout(r, 500)) }
    throw new Error('Browser nicht erreichbar')
  }
  private open(url: string) { return new Promise<void>((res, rej) => { this.ws = new WebSocket(url); this.ws.on('open', () => res()); this.ws.on('error', rej); this.ws.on('message', (m) => { const d = JSON.parse(String(m)); if (d.id && this.pending.has(d.id)) { this.pending.get(d.id)!(d); this.pending.delete(d.id) } }) }) }
  send(method: string, params: any = {}) { return new Promise<any>((res) => { const id = ++this.id; this.pending.set(id, res); this.ws.send(JSON.stringify({ id, method, params })) }) }
  async eval(expr: string): Promise<any> { const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }); return r.result?.result?.value }
  async waitFor(expr: string, ms = 30_000, what = expr) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await this.eval(expr)) return true; await new Promise(r => setTimeout(r, 400)) } throw new Error(`Zeitüberschreitung: ${what}`) }
  close() { try { this.ws.close() } catch {} }
}

async function withBrowser<T>(extraArgs: string[], fn: (c: Cdp) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), 'brave-e2e-'))
  const b = spawn(BRAVE, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${dir}`, '--no-first-run', '--disable-gpu', '--no-sandbox', '--window-size=1200,1600', ...extraArgs, 'about:blank'], { stdio: 'ignore' })
  try { const c = await Cdp.connect(CDP_PORT); try { return await fn(c) } finally { c.close() } } finally { b.kill('SIGKILL'); await new Promise(r => setTimeout(r, 800)); rmSync(dir, { recursive: true, force: true }) }
}

// Durch die Seite klicken bis zum Absenden. Liefert, was der Besucher sah und was gesendet wurde.
async function bookThroughPage(c: Cdp, opts: { waitForToken: boolean }) {
  await c.send('Page.enable'); await c.send('Page.navigate', { url: `http://localhost:${WEB_PORT}/termine?type=ty1` })
  await c.waitFor(`[...document.querySelectorAll('button')].some(b => b.textContent.trim() === '10:00')`, 90_000, 'Zeit 10:00 sichtbar')
  await c.eval(`[...document.querySelectorAll('button')].find(b => b.textContent.trim() === '10:00').click()`)
  await c.waitFor(`document.querySelector('input[type=email]')`, 20_000, 'Formular sichtbar')
  const fill = (sel: string, v: string) => c.eval(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  await fill('input[placeholder="Max Mustermann"]', 'E2E Test'); await fill('input[type=email]', 'e2e@invalid.example')
  await new Promise(r => setTimeout(r, 1500))
  const widgetInDom = await c.eval(`!!document.querySelector('.plx-turnstile')`)
  if (opts.waitForToken) await c.waitFor(`(document.querySelector('input[name="cf-turnstile-response"]')?.value || '').length > 10`, 60_000, 'Cloudflare-Token')
  // Das Widget-Fenster liegt in einem geschlossenen Shadow-DOM (nicht abfragbar); sichtbar ist es am versteckten Antwortfeld, das Cloudflare anlegt, sobald es gerendert ist
  const iframe = await c.eval(`!!document.querySelector('input[name="cf-turnstile-response"]')`)
  const before = log.filter(l => l.method === 'POST').length
  await c.eval(`document.querySelector('button[type=submit]').click()`)
  await new Promise(r => setTimeout(r, 4000))
  const text = await c.eval(`document.body.innerText`) as string
  const posts = log.filter(l => l.method === 'POST').slice(before)
  return { widgetInDom, iframe, posts, text, shot: await c.send('Page.captureScreenshot', { format: 'png' }) }
}

const available = existsSync(BRAVE) && existsSync(join(NEXORA_DIR, 'package.json'))
describe.skipIf(!available)('Buchungsseite im echten Browser: Widget und Serverprüfung stimmen überein', () => {
  beforeAll(async () => { await startApi(); await startWeb() })
  afterAll(async () => { try { process.kill(-web.pid!, 'SIGKILL') } catch {} ; await new Promise<void>(r => apiServer ? apiServer.close(() => r()) : r()) })

  it('Bot-Schutz AN: Widget wird gerendert, das Token geht mit der Buchung, der Server nimmt sie an', async () => {
    setup(true)
    const r = await withBrowser([], c => bookThroughPage(c, { waitForToken: true }))
    expect(log.find(l => l.method === 'GET')?.reply?.botProtection).toBe(true)
    expect(r.widgetInDom).toBe(true); expect(r.iframe).toBe(true)
    expect(r.posts).toHaveLength(1); expect(r.posts[0].body.turnstileToken).toMatch(/^XXXX\.DUMMY/); expect(r.posts[0].status).toBe(200)
    expect(db.writes.filter(w => w === 'plexora-termine-bookings:PutCommand')).toHaveLength(1)
    expect(cloudflare.calls.length).toBeGreaterThan(0)                                         // Siteverify wurde aufgerufen
    require('node:fs').writeFileSync('/tmp/e2e-booking-on.png', Buffer.from(r.shot.result.data, 'base64'))
  })
  it('Bot-Schutz AUS: kein Widget, kein Token in der Anfrage, der Server nimmt die Buchung an und fragt Cloudflare nicht', async () => {
    setup(false)
    const r = await withBrowser([], c => bookThroughPage(c, { waitForToken: false }))
    expect(log.find(l => l.method === 'GET')?.reply?.botProtection).toBe(false)
    expect(r.widgetInDom).toBe(false)
    expect(r.posts).toHaveLength(1); expect('turnstileToken' in r.posts[0].body).toBe(false); expect(r.posts[0].status).toBe(200)
    expect(cloudflare.calls).toHaveLength(0)
    require('node:fs').writeFileSync('/tmp/e2e-booking-off.png', Buffer.from(r.shot.result.data, 'base64'))
  })
  it('Bot-Schutz AN, aber das Widget lädt nicht (Werbeblocker/Netz): verständliche Meldung, es wird nichts gesendet, es wird nichts gebucht', async () => {
    setup(true)
    const r = await withBrowser(['--host-resolver-rules=MAP challenges.cloudflare.com ~NOTFOUND'], c => bookThroughPage(c, { waitForToken: false }))
    expect(r.widgetInDom).toBe(true); expect(r.iframe).toBe(false)
    expect(r.text).toMatch(/Sicherheitsprüfung konnte nicht geladen werden/); expect(r.text).toMatch(/Bitte warten Sie einen Moment, bis die Sicherheitsprüfung abgeschlossen ist/)
    expect(r.posts).toHaveLength(0); expect(db.writes.filter(w => w === 'plexora-termine-bookings:PutCommand')).toHaveLength(0)
  })
})
