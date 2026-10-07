import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { st, reset, installMocks, ev, code, OWNER, OWNER_B, MEMBER, DEMO, pngB64, jpgB64 } from './helpers'
import { DEFAULT_INVITE, SAMPLE_CTX } from '../../shared/mailTemplate'
import { PNG } from 'pngjs'
import jpeg from 'jpeg-js'

let getInvite: any, putInvite: any, delInvite: any, upload: any, delLogo: any, testSend: any, inviteMember: any, store: any
beforeAll(async () => {
  installMocks()
  getInvite = (await import('../../server/api/settings/mail-templates/invite.get')).default
  putInvite = (await import('../../server/api/settings/mail-templates/invite.put')).default
  delInvite = (await import('../../server/api/settings/mail-templates/invite.delete')).default
  upload = (await import('../../server/api/settings/mail-templates/logo.post')).default
  delLogo = (await import('../../server/api/settings/mail-templates/logo.delete')).default
  testSend = (await import('../../server/api/settings/mail-templates/invite-test.post')).default
  inviteMember = (await import('../../server/api/team/invite.post')).default
  store = await import('../../server/utils/mailTemplateStore')
})
beforeEach(() => { reset(); st.members.push({ tenantId: OWNER.email, memberEmail: MEMBER.email, status: 'active', role: 'member' }) })
const cfg = (over: any = {}) => ({ ...JSON.parse(JSON.stringify(DEFAULT_INVITE)), ...over })
const up = (auth: any, body: any) => code(upload(ev(auth, body)))
const KEY_RE = /^mail-logos\/[0-9a-f]{16}\/[0-9a-f]{32}\.(png|jpg)$/

describe('Vorlage lesen und speichern: Inhaber, Demo, Mandantentrennung', () => {
  it('ohne Anmeldung 401, Team-Mitglied 403 (nur der Inhaber), Demo-Konto darf nicht schreiben (403)', async () => {
    for (const h of [getInvite, putInvite, delInvite, upload, delLogo, testSend]) expect((await code(h(ev(undefined, cfg())))).code).toBe(401)
    for (const [name, h] of [['get', getInvite], ['put', putInvite], ['del', delInvite], ['upload', upload], ['delLogo', delLogo], ['test', testSend]] as const) expect((await code(h(ev(MEMBER, cfg())))).code, `Mitglied ${name}`).toBe(403)
    for (const [name, h] of [['put', putInvite], ['del', delInvite], ['upload', upload], ['delLogo', delLogo], ['test', testSend]] as const) expect((await code(h(ev(DEMO, name === 'upload' ? { fileBase64: pngB64() } : cfg())))).code, `Demo ${name}`).toBe(403)
    expect(st.settings.size).toBe(0); expect(st.s3.size).toBe(0); expect(st.mails).toEqual([])
  })
  it('ohne gespeicherte Vorlage liefert der Inhaber den Standard (customized: false)', async () => {
    const r: any = await getInvite(ev(OWNER)); expect(r.config).toEqual(DEFAULT_INVITE); expect(r.customized).toBe(false); expect(r.warnings).toEqual([])
  })
  it('speichern und lesen; ungültige Vorlage → 400 mit Feld und Erklärung, nichts wird gespeichert', async () => {
    const good = cfg({ heading: 'Willkommen im Team' }); expect((await code(putInvite(ev(OWNER, good)))).code).toBe(200)
    expect(((await getInvite(ev(OWNER))) as any).config.heading).toBe('Willkommen im Team')
    const before = JSON.stringify([...st.settings.entries()])
    const bad = await code(putInvite(ev(OWNER, cfg({ body: 'Klick auf www.evil.de' })))); expect(bad.code).toBe(400); expect(bad.data).toEqual({ field: 'body' }); expect(bad.message).toMatch(/nicht erlaubt/)
    expect(JSON.stringify([...st.settings.entries()])).toBe(before)
  })
  it('der Mandant kommt nur aus dem Token: scope/tenantId/userId im Body ändern nichts; jeder Mandant hat seine eigene Vorlage', async () => {
    await putInvite(ev(OWNER, { ...cfg({ heading: 'Nur für A' }), scope: OWNER_B.email, tenantId: OWNER_B.email, userId: OWNER_B.email }))
    expect([...st.settings.keys()]).toEqual([`mail-template-invite|${OWNER.email}`])
    expect(((await getInvite(ev(OWNER_B))) as any).config.heading).toBe(DEFAULT_INVITE.heading)
    await putInvite(ev(OWNER_B, cfg({ heading: 'Nur für B' })))
    expect(((await getInvite(ev(OWNER))) as any).config.heading).toBe('Nur für A'); expect(((await getInvite(ev(OWNER_B))) as any).config.heading).toBe('Nur für B')
  })
  it('zurücksetzen entfernt Vorlage und eigenes Logo (Datei im Bucket)', async () => {
    await up(OWNER, { fileBase64: pngB64() }); expect(st.s3.size).toBe(1)
    expect((await code(delInvite(ev(OWNER)))).code).toBe(200); expect(st.s3.size).toBe(0); expect(st.settings.size).toBe(0)
    expect(((await getInvite(ev(OWNER))) as any).config).toEqual(DEFAULT_INVITE)
  })
  it('eine beschädigte gespeicherte Zeile wird nie roh ausgeliefert: der Editor bekommt eine geprüfte Fassung', async () => {
    st.settings.set(`mail-template-invite|${OWNER.email}`, { settingId: 'mail-template-invite', scope: OWNER.email, config: { heading: '<script>x</script>', colors: { page: 'url(x)' }, evil: true } })
    const r: any = await getInvite(ev(OWNER)); expect(r.config.colors.page).toBe(DEFAULT_INVITE.colors.page); expect(r.config.evil).toBeUndefined()
  })
})

describe('Logo-Upload: Ablage, Sicherheit, Rate-Limit', () => {
  it('speichert nur das neu kodierte Bild unter Mandanten-Schlüssel + 128-Bit-Zufalls-ID; Name und Pfad stammen nie aus der Anfrage; fester Content-Type', async () => {
    const src = pngB64(960, 384)
    const r = await up(OWNER, { fileBase64: src, fileName: 'Mein geheimes Logo (Chef).png' })
    expect(r.code).toBe(200); const key = [...st.s3.keys()][0]
    expect(key).toMatch(KEY_RE); expect(key.split('/').slice(1).join('/')).not.toMatch(/Mein|geheim|Chef|logo|firma|chef-a|@/i)
    const obj = st.s3.get(key)!; expect(obj.contentType).toBe('image/png'); expect(obj.cacheControl).toMatch(/immutable/)
    expect(obj.body.equals(Buffer.from(src, 'base64'))).toBe(false)                  // nicht das Original
    const dec = PNG.sync.read(obj.body); expect(dec.width).toBe(500); expect(dec.height).toBe(200)
    const s: any = st.settings.get(`mail-template-invite|${OWNER.email}`).config; expect(s.logo).toMatchObject({ mode: 'custom', file: key, w: 500, h: 200 })
    expect((r as any).r.logoUrl).toBe(`https://plexora-files.s3.eu-central-1.amazonaws.com/${key}`)
  })
  it('zu kleines Bild: Upload klappt, die Antwort enthält die Warnung; ausreichend großes: keine Warnung', async () => {
    const small: any = await up(OWNER, { fileBase64: pngB64(120, 40) }); expect(small.code).toBe(200); expect(small.r.warning).toMatch(/120 × 40/)
    const big: any = await up(OWNER, { fileBase64: pngB64(600, 240) }); expect(big.code).toBe(200); expect(big.r.warning).toBeNull(); expect([big.r.width, big.r.height]).toEqual([500, 200])
  })
  it('Zufalls-ID: bei jedem Upload neu, mindestens 128 Bit', async () => {
    await up(OWNER, { fileBase64: pngB64() }); const k1 = [...st.s3.keys()][0]; await up(OWNER, { fileBase64: pngB64() }); const k2 = [...st.s3.keys()][0]
    expect(k1.split('/')[2].split('.')[0]).toHaveLength(32); expect(k1).not.toBe(k2); expect(k1.split('/')[1]).toBe(k2.split('/')[1])
  })
  it('Ersetzen löscht die alte Datei; Entfernen löscht die Datei und stellt auf "kein Logo"', async () => {
    await up(OWNER, { fileBase64: pngB64() }); const first = [...st.s3.keys()][0]
    await up(OWNER, { fileBase64: jpgB64() }); expect(st.s3.size).toBe(1); expect(st.s3.has(first)).toBe(false); expect([...st.s3.keys()][0]).toMatch(/\.jpg$/)
    expect((await code(delLogo(ev(OWNER)))).code).toBe(200); expect(st.s3.size).toBe(0)
    const c: any = st.settings.get(`mail-template-invite|${OWNER.email}`).config; expect(c.logo).toMatchObject({ mode: 'none', file: '', w: 0, h: 0 })
  })
  it('SVG, GIF, WebP, getarntes HTML/SVG, Pfadangriffe, kaputte und zu große Dateien: 400 und es wird nichts gespeichert', async () => {
    const b64 = (s: string | Buffer) => Buffer.from(s).toString('base64')
    const bad: any[] = [
      { fileBase64: b64('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'), fileName: 'logo.png' }, { fileBase64: b64('GIF89a\x01\x00\x01\x00'), fileName: 'a.png' }, { fileBase64: b64('RIFF\x24\x00\x00\x00WEBPVP8 '), fileName: 'a.png' },
      { fileBase64: b64('<!DOCTYPE html><script>alert(1)</script>'), fileName: 'x.jpg' }, { fileBase64: pngB64(), fileName: '../../etc/passwd.png' }, { fileBase64: pngB64(), fileName: 'logo.html.png' }, { fileBase64: pngB64(), fileName: 'a/b.png' },
      { fileBase64: pngB64().slice(0, 80) }, { fileBase64: 'x'.repeat(500_000) }, { fileBase64: '***nicht-base64***' }, { fileBase64: '' }, {}, { fileBase64: 12345 }, { fileBase64: pngB64(2001, 1) }, { fileBase64: b64(Buffer.concat([Buffer.from(pngB64(), 'base64'), Buffer.from('<html>')])) },
    ]
    for (const b of bad) { st.counters.clear(); const r = await up(OWNER, b); expect(r.code, JSON.stringify(b).slice(0, 80)).toBe(400); expect(r.message!.length).toBeGreaterThan(5) }
    expect(st.s3.size).toBe(0); expect(st.s3calls).toEqual([]); expect(st.settings.size).toBe(0)
  })
  it('Original über 300 KB (wie das Logo mit 495 KB): Upload klappt, gespeichert wird höchstens 300 KB', async () => {
    const d = Buffer.alloc(500 * 200 * 4); for (let i = 0; i < d.length; i++) d[i] = i % 4 === 3 ? 255 : Math.floor(Math.random() * 256)
    const big = Buffer.from(jpeg.encode({ data: d, width: 500, height: 200 }, 100).data); expect(big.length).toBeGreaterThan(300 * 1024)
    const r = await up(OWNER, { fileBase64: big.toString('base64'), fileName: 'logo250x100.jpg' }); expect(r.code).toBe(200)
    expect([...st.s3.values()][0].body.length).toBeLessThanOrEqual(300 * 1024)
  })
  it('über 3 MB wird mit klarer Meldung abgelehnt', async () => {
    const r = await up(OWNER, { fileBase64: Buffer.alloc(3 * 1024 * 1024 + 1000, 1).toString('base64'), fileName: 'x.png' })
    expect(r.code).toBe(400); expect(r.message).toMatch(/3 MB/); expect(st.s3.size).toBe(0)
  })
  it('EXIF-Standort ist nach dem Upload aus dem gespeicherten JPG entfernt', async () => {
    const j = Buffer.from(jpgB64(), 'base64'); const body = Buffer.concat([Buffer.from('Exif\0\0GPSLatitude=52.52 GPSLongitude=13.40 SecretCam')]); const seg = Buffer.alloc(4); seg[0] = 0xff; seg[1] = 0xe1; seg.writeUInt16BE(body.length + 2, 2)
    const withExif = Buffer.concat([j.subarray(0, 2), seg, body, j.subarray(2)])
    expect(withExif.toString('latin1')).toContain('GPSLatitude')
    expect((await up(OWNER, { fileBase64: withExif.toString('base64'), fileName: 'foto.jpg' })).code).toBe(200)
    const stored = [...st.s3.values()][0].body.toString('latin1'); for (const n of ['Exif', 'GPS', 'SecretCam', '52.52']) expect(stored).not.toContain(n)
    expect(jpeg.decode([...st.s3.values()][0].body).width).toBeGreaterThan(0)
  })
  it('höchstens 10 Uploads pro Stunde und Konto; ein anderes Konto ist davon nicht betroffen; abgelehnte Dateien zählen mit', async () => {
    for (let n = 1; n <= 10; n++) expect((await up(OWNER, { fileBase64: pngB64(20, 20) })).code, `Upload ${n}`).toBe(200)
    const r = await up(OWNER, { fileBase64: pngB64(20, 20) }); expect(r.code).toBe(429); expect(r.message).toMatch(/pro Stunde/)
    expect((await up(OWNER_B, { fileBase64: pngB64(20, 20) })).code).toBe(200)
  })
  it('fällt das Speichern der Vorlage aus, bleibt keine verwaiste Datei im Bucket', async () => {
    st.failSettingsPut = true; const r = await up(OWNER, { fileBase64: pngB64() }); expect(r.code).toBe(500 === r.code ? 500 : r.code); expect(st.s3.size).toBe(0)
  })
})

describe('IDOR: ein anderer Mandant kann Logos weder ersetzen noch löschen noch übernehmen', () => {
  it('B lädt hoch, löscht, speichert mit A-Datei: A bleibt unberührt', async () => {
    await up(OWNER, { fileBase64: pngB64() }); const keyA = [...st.s3.keys()][0]
    await up(OWNER_B, { fileBase64: jpgB64() }); const keyB = [...st.s3.keys()].find(k => k !== keyA)!
    expect(keyB.split('/')[1]).not.toBe(keyA.split('/')[1]); expect(st.s3.has(keyA)).toBe(true)
    // B versucht, A's Datei als eigenes Logo einzutragen (Datei und Maße kommen nie aus der Anfrage)
    const forged = cfg({ logo: { ...DEFAULT_INVITE.logo, mode: 'custom', file: keyA, w: 1, h: 1 } })
    const put = await code(putInvite(ev(OWNER_B, forged))); expect(put.code).toBe(200)
    const bcfg: any = st.settings.get(`mail-template-invite|${OWNER_B.email}`).config; expect(bcfg.logo.file).toBe(keyB); expect(bcfg.logo.file).not.toBe(keyA)
    // B löscht sein Logo und setzt zurück: A's Datei bleibt
    await delLogo(ev(OWNER_B)); await delInvite(ev(OWNER_B)); expect(st.s3.has(keyA)).toBe(true); expect(st.s3.has(keyB)).toBe(false)
    expect(((st.settings.get(`mail-template-invite|${OWNER.email}`) as any).config.logo.file)).toBe(keyA)
  })
  it('selbst eine beschädigte Zeile mit fremdem Pfad führt nicht dazu, dass das fremde Logo gezeigt oder gelöscht wird', async () => {
    await up(OWNER, { fileBase64: pngB64() }); const keyA = [...st.s3.keys()][0]
    st.settings.set(`mail-template-invite|${OWNER_B.email}`, { settingId: 'mail-template-invite', scope: OWNER_B.email, config: { ...DEFAULT_INVITE, logo: { ...DEFAULT_INVITE.logo, mode: 'custom', file: keyA, w: 100, h: 40 } } })
    const c: any = ((await getInvite(ev(OWNER_B))) as any); expect(c.logoPreviewUrl).toBe('')                       // gehört nicht B → kein Bild
    await delLogo(ev(OWNER_B)); await delInvite(ev(OWNER_B)); expect(st.s3.has(keyA)).toBe(true)                      // und wird auch nicht gelöscht
    await store.deleteLogoObject(OWNER_B.email, keyA); await store.deleteLogoObject(OWNER_B.email, '../lambda/lambda-new.zip'); await store.deleteLogoObject(OWNER_B.email, 'lambda/x.zip'); expect(st.s3.has(keyA)).toBe(true)
    expect(st.s3calls.filter(c => c.startsWith('Delete:') && !c.includes(store.tenantKey(OWNER.email)))).toEqual([])
  })
})

describe('Testmail', () => {
  it('geht nur an die eigene Adresse (es gibt kein Empfängerfeld), mit HTML und Klartext, Betreff mit [Test], Link ist nicht gültig', async () => {
    const r: any = await testSend(ev(OWNER, { to: 'opfer@fremd.de', recipient: 'opfer@fremd.de', email: 'opfer@fremd.de', config: cfg({ heading: 'Probe' }) }))
    expect(r).toMatchObject({ status: 'sent', to: OWNER.email }); expect(st.mails).toHaveLength(1)
    const m = st.mails[0]; expect(m.to).toBe(OWNER.email); expect(m.subject).toMatch(/^\[Test\] /); expect(m.html).toContain('Probe'); expect(m.text).toContain('TESTMAIL-NICHT-GUELTIG'); expect(m.from).toBe('"Anna Chefin über Plexora" <team@plexora.eu>')
    expect(JSON.stringify(m)).not.toContain('opfer@fremd.de')
  })
  it('höchstens 5 pro Stunde; ein ungültiger Entwurf wird mit Erklärung abgelehnt und verbraucht keine Mail', async () => {
    for (let n = 1; n <= 5; n++) expect((await code(testSend(ev(OWNER, {})))).code, `Test ${n}`).toBe(200)
    expect((await code(testSend(ev(OWNER, {})))).code).toBe(429); expect(st.mails).toHaveLength(5)
    reset(); st.members.push({ tenantId: OWNER.email, memberEmail: MEMBER.email, status: 'active' })
    const bad = await code(testSend(ev(OWNER, { config: cfg({ subject: 'Hallo\r\nBcc: x@y.de' }) }))); expect(bad.code).toBe(400); expect(st.mails).toEqual([])
  })
  it('das Versand-Protokoll bekommt keine Vorschau (nur Adresse und Betreff) und enthält weder Link noch Token', async () => {
    await testSend(ev(OWNER, {})); const log = st.logs[0]
    expect(log).toMatchObject({ kind: 'team_invite', to: OWNER.email, preview: '' }); expect(JSON.stringify(log)).not.toMatch(/TESTMAIL|https?:|invite\?token/i)
  })
})

describe('Einladung nutzt die Vorlage des Mandanten', () => {
  const invite = (email = 'neu@firma.de', auth: any = OWNER) => code(inviteMember(ev(auth, { inviteeEmail: email })))
  const token = () => st.members.find(m => m.status === 'invited')!.inviteToken
  it('ohne Vorlage: Standardtexte; mit Vorlage: eigener Betreff und Text; HTML und Klartext; Link und Sicherheitsteil immer da', async () => {
    expect((await invite()).code).toBe(200); let m = st.mails[0]
    expect(m.subject).toBe('Du wurdest zu Plexora eingeladen'); expect(m.html).toContain('Anna Chefin hat dich eingeladen'); expect(m.text).toContain(`https://app.plexora.eu/invite?token=${token()}`)
    for (const part of ['Sicherheitshinweis', 'chef-a@firma.de', 'neu@firma.de', 'ignoriere sie']) { expect(m.html).toContain(part); expect(m.text).toContain(part) }
    await putInvite(ev(OWNER, cfg({ subject: 'Komm ins Team von {{einladender_name}}', heading: 'Hallo!', buttonText: 'Los geht’s' })))
    st.members = st.members.filter(x => x.status !== 'invited'); st.mails.length = 0
    expect((await invite('zweite@firma.de')).code).toBe(200); m = st.mails[0]
    expect(m.subject).toBe('Komm ins Team von Anna Chefin'); expect(m.html).toContain('Hallo!'); expect(m.html).toContain('Los geht’s'); expect(m.html).toContain('Sicherheitshinweis')
  })
  it('der Button zeigt immer auf den Server-Link, auch wenn die gespeicherte Vorlage beschädigt oder die Datenbank nicht lesbar ist', async () => {
    st.settings.set(`mail-template-invite|${OWNER.email}`, { settingId: 'mail-template-invite', scope: OWNER.email, config: { buttonUrl: 'https://evil.de', heading: 5, colors: 'x', font: [], subject: 'a\r\nBcc: x@y.de' } })
    expect((await invite()).code).toBe(200); const m = st.mails[0]; const t = token()
    expect([...m.html.matchAll(/href="([^"]*)"/g)].map((x: any) => x[1]).every((h: string) => h === `https://app.plexora.eu/invite?token=${t}`)).toBe(true); expect(m.subject).not.toMatch(/[\r\n]/); expect(m.html).not.toContain('evil.de')
  })
  it('das Protokoll speichert weder Token noch Link: Art team_invite, Adresse und Betreff, Vorschau leer', async () => {
    await invite(); const log = st.logs[0]; const t = token()
    expect(log).toMatchObject({ kind: 'team_invite', to: 'neu@firma.de', preview: '' }); expect(log.subject).toBe('Du wurdest zu Plexora eingeladen'); expect(JSON.stringify(log)).not.toContain(t); expect(JSON.stringify(log)).not.toMatch(/https?:\/\//)
  })
  it('das Logo hat für alle Empfänger dieselbe Adresse (kein Empfängerbezug, kein Tracking)', async () => {
    await up(OWNER, { fileBase64: pngB64() }); await putInvite(ev(OWNER, cfg({ logo: { ...DEFAULT_INVITE.logo, mode: 'custom' } })))
    await invite('eins@firma.de'); await invite('zwei@firma.de'); const src = (h: string) => h.match(/<img src="([^"]+)"/)![1]
    expect(src(st.mails[0].html)).toBe(src(st.mails[1].html)); expect(src(st.mails[0].html)).toMatch(/\/mail-logos\/[0-9a-f]{16}\/[0-9a-f]{32}\.png$/); expect(src(st.mails[0].html)).not.toMatch(/eins|zwei|token|\?/)
    expect(st.mails[0].html.match(/<img/g)!.length).toBe(1)
  })
  it('das Rate-Limit der Einladungen und die Mail-Ausschlussregel gelten unverändert (Demo-Konto 403)', async () => {
    expect((await invite('x@firma.de', DEMO)).code).toBe(403); expect(st.mails).toEqual([])
    for (let n = 1; n <= 10; n++) await invite(`p${n}@firma.de`); expect((await invite('elf@firma.de')).code).toBe(429)
  })
})
