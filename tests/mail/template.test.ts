import { describe, it, expect } from 'vitest'
import {
  DEFAULT_INVITE, STYLE_PRESETS, applyPreset, resolveInviteConfig, validateInviteConfig, containsLink, unknownPlaceholders, applyPlaceholders, contrastRatio, contrastWarnings,
  renderInviteMail, isAcceptUrl, isLogoUrl, safeDisplayName, SECURITY_BOX, SAMPLE_CTX, ABUSE_ADDRESS, MAIL_LIMITS, BUTTON_BLUE, logoUrlForFile, type InviteMailConfig,
} from '../../shared/mailTemplate'

const URL_OK = 'https://app.plexora.eu/invite?token=11111111-2222-4333-8444-555555555555'
const CTX = { ...SAMPLE_CTX, acceptUrl: URL_OK, inviterEmail: 'chef@firma.de', inviteeEmail: 'neu@firma.de', inviterName: 'Chef Person' }
const clone = (): any => JSON.parse(JSON.stringify(DEFAULT_INVITE))
const hrefs = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map(m => m[1])

describe('Standard und Stilvorlagen', () => {
  it('der Standard ist gültig, hat keine Kontrastwarnung und der Button ist das Blau von "Anfrage stellen" mit lesbarer Schrift', () => {
    expect(validateInviteConfig(clone()).ok).toBe(true); expect(contrastWarnings(DEFAULT_INVITE)).toEqual([])
    expect(DEFAULT_INVITE.colors.button).toBe(BUTTON_BLUE); expect(contrastRatio(DEFAULT_INVITE.colors.buttonText, DEFAULT_INVITE.colors.button)).toBeGreaterThanOrEqual(4.5)
  })
  it('alle vier Stilvorlagen sind gültig und ohne Kontrastwarnung', () => {
    expect(Object.keys(STYLE_PRESETS).sort()).toEqual(['dunkel', 'hell', 'plexora-blau', 'schlicht'])
    for (const k of Object.keys(STYLE_PRESETS)) { const c = applyPreset(DEFAULT_INVITE, k); expect(validateInviteConfig(c).ok, k).toBe(true); expect(contrastWarnings(c), k).toEqual([]) }
  })
  it('eine Vorlage ersetzt Farben/Schrift/Button/Layout, behält aber Texte und Logo', () => {
    const c = applyPreset({ ...clone(), heading: 'Mein Titel', logo: { ...clone().logo, alt: 'Meine Firma' } }, 'dunkel')
    expect(c.colors.page).toBe('#0b0f1a'); expect(c.heading).toBe('Mein Titel'); expect(c.logo.alt).toBe('Meine Firma')
  })
  it('fehlende oder kaputte Konfiguration ergibt immer den Standard (die Einladung bricht nie ab)', () => {
    for (const bad of [undefined, null, 'quatsch', 42, [], {}, { colors: 'x', font: 5, button: [], layout: null, logo: 'x' }]) expect(resolveInviteConfig(bad), JSON.stringify(bad)).toEqual(DEFAULT_INVITE)
  })
})

describe('Texte: nur reiner Text, keine Links, keine Zeilenumbrüche im Betreff', () => {
  const FIELDS = ['subject', 'heading', 'body', 'buttonText', 'footer'] as const
  const LINKS = ['https://evil.de/login', 'http://evil.de', 'www.evil.de', 'evil.de', 'EVIL.DE/abc', 'Mehr auf sub.evil.co.uk', 'mailto:chef@x.de', 'tel:+49123456', 'javascript:alert(1)', 'data:text/html,x', 'chef@x.de', '//evil.de',
    'ｈｔｔｐｓ：／／evil．de', 'evil。de', 'ev​il.de', 'hxxp://evil.com']
  it('Links, Domains, Adressen, mailto:, tel: werden in jedem Textfeld abgelehnt – auch mit Unicode-Tricks', () => {
    for (const f of FIELDS) for (const l of LINKS) { const c = clone(); c[f] = f === 'buttonText' ? l : `Bitte hier klicken ${l} danke`; const r = validateInviteConfig(c); expect(r.ok, `${f}: ${l}`).toBe(false); if (!r.ok) { expect(r.field).toBe(f); expect(r.error).toMatch(/nicht erlaubt/) } }
  })
  it('normale deutsche Texte mit Satzzeichen, Zahlen und Platzhaltern sind erlaubt', () => {
    for (const t of ['Hallo {{eingeladene_email}}, willkommen!', 'Sehr geehrte Damen und Herren, z. B. ab 3.5 Uhr.', 'Ein Team, eine Plattform – los geht’s (bis {{ablauf_datum}}).', 'Dr. Müller lädt dich ein']) { const c = clone(); c.body = t; expect(validateInviteConfig(c).ok, t).toBe(true) }
  })
  it('Betreff: Zeilenumbruch, Wagenrücklauf und Steuerzeichen werden abgelehnt (Header-Einschleusung)', () => {
    for (const s of ['Hallo\nBcc: opfer@x.de', 'Hallo\r\nBcc: x', 'Hallo\rWelt', 'Hallo Welt', 'Hallo\u0000Welt']) { const c = clone(); c.subject = s; const r = validateInviteConfig(c); expect(r.ok, JSON.stringify(s)).toBe(false); if (!r.ok) expect(r.field).toBe('subject') }
  })
  it('Längen: Betreff 90, Überschrift 80, Text 500, Button 30, Fußzeile 200, Alternativtext 80 – und nicht leer', () => {
    const over: Record<string, number> = { subject: MAIL_LIMITS.subject, heading: MAIL_LIMITS.heading, body: MAIL_LIMITS.body, buttonText: MAIL_LIMITS.button, footer: MAIL_LIMITS.footer }
    for (const [f, max] of Object.entries(over)) { const ok = clone(); ok[f] = 'a'.repeat(max); expect(validateInviteConfig(ok).ok, `${f} ${max}`).toBe(true); const bad = clone(); bad[f] = 'a'.repeat(max + 1); expect(validateInviteConfig(bad).ok, `${f} ${max + 1}`).toBe(false) }
    for (const f of ['subject', 'heading', 'body', 'buttonText']) { const c = clone(); c[f] = '   '; expect(validateInviteConfig(c).ok, `${f} leer`).toBe(false) }
    const alt = clone(); alt.logo.alt = ''; expect(validateInviteConfig(alt).ok).toBe(false); alt.logo.alt = 'a'.repeat(81); expect(validateInviteConfig(alt).ok).toBe(false)
  })
  it('HTML und Skripte im Text erscheinen als Text, nie als Markup (auch über den lesenden Weg ohne strenge Prüfung)', () => {
    const evil = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '"><svg onload=alert(1)>', "' onmouseover='alert(1)", '<b>fett</b>', '</td></tr></table><h1>Phishing</h1>']
    for (const x of evil) for (const f of FIELDS) {
      const c = clone(); c[f] = f === 'subject' ? x.replace(/\n/g, ' ') : x
      const m = renderInviteMail(c, CTX)
      expect(m.html, `${f}: ${x}`).not.toMatch(/<script|<img src=x|<svg|<b>fett|<h1>Phishing/i)   // als Text darf alles dastehen, nur kein echtes Markup
      expect(m.html, `${f}: ${x}`).not.toMatch(/" on\w+=|' on\w+=/i)
      expect(m.html).toContain(x.replace(/[&<>"'`]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' } as any)[ch]).slice(0, 12))
      expect(m.subject).not.toMatch(/[\r\n]/)
    }
  })
})

describe('Platzhalter', () => {
  it('bekannte werden ersetzt, unbekannte bleiben als Klartext und werden gemeldet', () => {
    expect(applyPlaceholders('{{einladender_name}} lädt {{ eingeladene_email }} zu {{produktname}} ein, bis {{ablauf_datum}}. {{nope}} {{ADMIN_PASSWORD}} {{{x}}} ${y}', { einladender_name: 'A', eingeladene_email: 'b@c.de', produktname: 'P', ablauf_datum: 'D' })).toBe('A lädt b@c.de zu P ein, bis D. {{nope}} {{ADMIN_PASSWORD}} {{{x}}} ${y}')
    expect(unknownPlaceholders('{{produktname}} {{nope}} {{Foo}} {{nope}}')).toEqual(['{{nope}}', '{{Foo}}'])
  })
  it('Platzhalterwerte werden maskiert und können weder HTML noch Zeilenumbrüche in den Betreff bringen', () => {
    const m = renderInviteMail(clone(), { ...CTX, inviterName: '<script>x</script>\r\nBcc: a@b.de' })
    expect(m.html).not.toContain('<script>x'); expect(m.subject).not.toMatch(/[\r\n]/); expect(m.fromName).not.toMatch(/[<>"\\\r\n]/)
  })
  it('der Anzeigename wird gesäubert; Links im Namen werden durch den Teil vor dem @ ersetzt', () => {
    expect(safeDisplayName('Maria "Chefin" <x>', 'm@x.de')).toBe('Maria Chefin x'); expect(safeDisplayName('Besuche evil.de jetzt', 'maria@x.de')).toBe('maria'); expect(safeDisplayName('', 'maria@x.de')).toBe('maria'); expect(safeDisplayName('a'.repeat(200), 'm@x.de').length).toBe(60)
  })
})

describe('Kein CSS-Freitext: Farbwerte, Schriften, Zahlen', () => {
  const HOSTILE = ['#fff;background:url(https://evil/x.png)', 'red', '#12345', '#GGGGGG', 'rgb(0,0,0)', 'expression(alert(1))', '#ffffff" onload="x', 'url(javascript:1)', '#fff</style><script>']
  it('ungültige Farben werden beim Speichern abgelehnt, jedes Farbfeld einzeln', () => {
    for (const k of ['page', 'card', 'heading', 'text', 'button', 'buttonText', 'footer']) for (const h of HOSTILE) { const c = clone(); c.colors[k] = h; const r = validateInviteConfig(c); expect(r.ok, `${k} ${h}`).toBe(false); if (!r.ok) expect(r.field).toBe(`colors.${k}`) }
    const c = clone(); c.colors.buttonBorder = 'url(x)'; expect(validateInviteConfig(c).ok).toBe(false); c.colors.buttonBorder = ''; expect(validateInviteConfig(c).ok).toBe(true)
  })
  it('Schriftnamen mit Semikolon oder url() werden abgelehnt; nur Einträge der Liste sind möglich', () => {
    for (const f of ['Arial;} body{display:none', "x';background:url(y)", 'url(x)', 'Comic Sans MS', '__proto__', 'constructor']) { const c = clone(); c.font.family = f; expect(validateInviteConfig(c).ok, f).toBe(false) }
    for (const f of ['sans', 'serif', 'mono', 'arial', 'georgia', 'verdana']) { const c = clone(); c.font.family = f; expect(validateInviteConfig(c).ok, f).toBe(true) }
  })
  it('auch beim Lesen werden geerbte Namen nicht als Schrift/Vorlage/Logo-Modus akzeptiert und gelangen nie ins HTML', () => {
    for (const x of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const r = resolveInviteConfig({ font: { family: x }, logo: { mode: x }, button: { width: x, align: x } }); expect(r.font.family, x).toBe('sans'); expect(r.logo.mode, x).toBe('none')
      expect(renderInviteMail({ font: { family: x } }, CTX).html, x).not.toMatch(/function|native code|\[object/)
      expect(applyPreset(DEFAULT_INVITE, x), x).toEqual(DEFAULT_INVITE)
    }
  })
  it('Zahlen nur in den Grenzen und nur als Zahl (kein "20px;x")', () => {
    const lim: [string, string, number, number][] = [['font', 'headingSize', 16, 40], ['font', 'textSize', 12, 20], ['font', 'buttonSize', 12, 22], ['button', 'radius', 0, 40], ['button', 'padV', 6, 28], ['button', 'padH', 12, 60], ['button', 'borderWidth', 0, 6], ['layout', 'cardWidth', 320, 640]]
    for (const [g, k, min, max] of lim) { for (const v of [min - 1, max + 1, '20px;x', NaN, null, 'x']) { const c = clone(); c[g][k] = v; expect(validateInviteConfig(c).ok, `${g}.${k}=${v}`).toBe(false) } for (const v of [min, max]) { const c = clone(); c[g][k] = v; expect(validateInviteConfig(c).ok, `${g}.${k}=${v}`).toBe(true) } }
  })
  it('feindliche Werte ändern das Ergebnis nicht: der lesende Weg fällt auf den Standard zurück, im HTML steht nie url(, expression, @import, <style> mit Nutzerwerten', () => {
    const c: any = clone(); c.colors = Object.fromEntries(Object.keys(c.colors).map(k => [k, HOSTILE[0]])); c.font = { family: 'a;b:url(x)', headingSize: '99px;x', textSize: 'expression(1)', buttonSize: -5 }; c.button = { radius: 'url(x)', padV: 'x', padH: 'y', width: 'full;x', align: '"><b>', borderWidth: '9px' }; c.layout = { cardWidth: '10000', divider: 'ja' }
    const r = resolveInviteConfig(c); expect(r.colors).toEqual(DEFAULT_INVITE.colors); expect(r.font.family).toBe('sans')
    const html = renderInviteMail(c, CTX).html
    expect(html).not.toMatch(/url\(|expression|@import|javascript:|background-image|<link|<script|evil/i)
    expect(r.font.buttonSize).toBe(12); expect(r.layout.cardWidth).toBe(640); expect(r.button.width).toBe('auto'); expect(r.button.align).toBe('center')   // auf die Grenzen bzw. den Standard gesetzt
  })
})

describe('Der Link: Button zeigt immer auf den Server-Link, der Link fehlt nie', () => {
  it('alle href im HTML sind genau der Server-Link – bei Standard, allen Vorlagen und bei beschädigter Konfiguration', () => {
    const cfgs: unknown[] = [DEFAULT_INVITE, undefined, null, {}, 'x', { buttonUrl: 'https://evil.de', href: 'https://evil.de', url: 'javascript:1', link: 'https://evil.de' }, ...Object.keys(STYLE_PRESETS).map(k => applyPreset(DEFAULT_INVITE, k))]
    for (const cfg of cfgs) { const m = renderInviteMail(cfg, CTX); const h = hrefs(m.html); expect(h.length).toBeGreaterThanOrEqual(2); expect(new Set(h)).toEqual(new Set([URL_OK])); expect(m.text).toContain(URL_OK); expect(m.html).toContain(`>${URL_OK}</a>`) }
  })
  it('ein Server-Link mit anderer Domain, anderem Pfad, Zusatzparametern oder anderem Protokoll wird nicht gerendert (es wird geworfen statt eine kaputte Mail zu senden)', () => {
    for (const bad of ['https://evil.de/invite?token=11111111-2222', 'http://app.plexora.eu/invite?token=11111111-2222', 'https://app.plexora.eu.evil.de/invite?token=11111111', 'https://app.plexora.eu/invite?token=11111111&x=1', 'https://app.plexora.eu/other?token=11111111', 'javascript:alert(1)', '', undefined, 'https://app.plexora.eu/invite?token=<script>']) {
      expect(isAcceptUrl(bad), String(bad)).toBe(false); expect(() => renderInviteMail(DEFAULT_INVITE, { ...CTX, acceptUrl: bad as any }), String(bad)).toThrow()
    }
    expect(isAcceptUrl(URL_OK)).toBe(true)
  })
})

describe('Fester Sicherheitsteil', () => {
  it('ist in jeder Mail (HTML und Klartext) mit Link, Absender, Empfänger, Ablaufdatum und Missbrauchshinweis enthalten – bei Standard, Vorlagen und Müll-Konfiguration', () => {
    const cfgs: unknown[] = [DEFAULT_INVITE, null, 'x', {}, { footer: '', heading: '', body: '' }, ...Object.keys(STYLE_PRESETS).map(k => applyPreset(DEFAULT_INVITE, k))]
    for (const cfg of cfgs) {
      const m = renderInviteMail(cfg, CTX)
      for (const part of ['Sicherheitshinweis', 'Annahme-Link:', 'chef@firma.de', 'neu@firma.de', 'ist bis', 'gültig', 'ignoriere sie', 'Missbrauch melden', ABUSE_ADDRESS]) { expect(m.html, `html ${part}`).toContain(part); expect(m.text, `text ${part}`).toContain(part) }
      expect(m.html).toContain(SECURITY_BOX.bg)
    }
  })
  it('bleibt lesbar, auch wenn Textfarbe und Hintergrund gleich sind: feste eigene Farben mit hohem Kontrast, unabhängig von der Konfiguration', () => {
    const c = clone(); c.colors = { ...c.colors, text: '#ffffff', card: '#ffffff', heading: '#ffffff', footer: '#ffffff' }
    const m = renderInviteMail(c, CTX)
    const box = m.html.slice(m.html.indexOf('Sicherheitshinweis') - 400, m.html.indexOf('Missbrauch melden') + 80)
    expect(box).toContain(`color:${SECURITY_BOX.text}`); expect(box).toContain(SECURITY_BOX.bg); expect(box).not.toContain('color:#ffffff')
    expect(contrastRatio(SECURITY_BOX.text, SECURITY_BOX.bg)).toBeGreaterThanOrEqual(7); expect(contrastRatio(SECURITY_BOX.link, SECURITY_BOX.bg)).toBeGreaterThanOrEqual(7)
  })
  it('lässt sich nicht abschalten oder umstellen: es gibt dafür kein Konfigurationsfeld, unbekannte Felder werden ignoriert', () => {
    const c: any = { ...clone(), security: false, hideSecurity: true, securityBox: { bg: '#000' }, showLink: false }
    expect(Object.keys(resolveInviteConfig(c))).toEqual(Object.keys(DEFAULT_INVITE)); expect(renderInviteMail(c, CTX).html).toContain('Sicherheitshinweis')
  })
})

describe('Mailtechnik', () => {
  const m = renderInviteMail(DEFAULT_INVITE, CTX)
  it('Tabellenlayout mit Inline-Styles, color-scheme, Button-Farbe auf td UND a, keine Skripte/Stylesheets/Hintergrundbilder/Pixel', () => {
    expect(m.html).toContain('<table'); expect(m.html).toContain('role="presentation"'); expect(m.html).toContain('name="color-scheme" content="light dark"'); expect(m.html).toContain('supported-color-schemes')
    const btnTd = m.html.match(/<td align="center" bgcolor="(#[0-9a-f]{6})" style="background-color:(#[0-9a-f]{6})/)!; expect(btnTd[1]).toBe(BUTTON_BLUE); expect(btnTd[2]).toBe(BUTTON_BLUE)
    expect(m.html).toMatch(new RegExp(`<a href="${URL_OK.replace(/[?]/g, '\\?')}"[^>]*background-color:${BUTTON_BLUE}`))
    expect(m.html).not.toMatch(/<script|<link|@import|background-image|background="|<iframe|<form|<video|<object|<embed|<img/i)
  })
  it('Klartext-Fassung vorhanden, mit Link, Text und den festen Sicherheitszeilen', () => {
    expect(m.text).toContain('Einladung zu Plexora'); expect(m.text).toContain(URL_OK); expect(m.text.split(URL_OK).length).toBeGreaterThanOrEqual(3); expect(m.text).not.toMatch(/<[a-z]/i)
  })
  it('kein Logo: der Produktname steht als Text im Kopf; kein Bild, kein Tracking', () => {
    expect(m.html).toMatch(/>Plexora<\/td>/); expect(m.html).not.toContain('<img')
  })
  it('Betreff und Absendername: "<Name> über <Produkt>", ohne Zeilenumbrüche', () => {
    expect(m.fromName).toBe('Chef Person über Plexora'); expect(m.subject).toBe('Du wurdest zu Plexora eingeladen')
  })
})

describe('Logo im Mailkopf', () => {
  const custom = { ...clone(), logo: { ...clone().logo, mode: 'custom', alt: 'Meine "Firma"', align: 'left', plate: true, plateColor: '#ffffff', file: 'mail-logos/0123456789abcdef/0123456789abcdef0123456789abcdef.png', w: 200, h: 80 } }
  const LOGO = logoUrlForFile(custom.logo.file)
  it('Bild mit width, height, alt (maskiert), display:block, ohne Link, ohne Parameter, ohne Empfängerbezug', () => {
    const m = renderInviteMail(custom, { ...CTX, logoUrl: LOGO })
    expect(m.html).toContain(`<img src="${LOGO}" width="200" height="80" alt="Meine &quot;Firma&quot;" style="display:block;`); expect(m.html).toContain('bgcolor="#ffffff"')   // Platte
    expect(LOGO).not.toMatch(/[?#=&]|chef|neu@|token/i); expect(m.html.match(/<img/g)!.length).toBe(1)
    expect(m.html).not.toMatch(/<a [^>]*>\s*<img/)                                          // das Logo ist nicht verlinkt
    expect(renderInviteMail(custom, { ...CTX, logoUrl: LOGO, inviteeEmail: 'ganz@anders.de' }).html.match(/<img src="[^"]*"/)![0]).toBe(m.html.match(/<img src="[^"]*"/)![0])   // gleiche Adresse für alle
  })
  it('doppelte Auflösung: gespeichert bis 480 Pixel, angezeigt höchstens 240 breit mit passender Höhe (Seitenverhältnis bleibt); kleinere Bilder in Originalgröße', () => {
    const show = (w: number, h: number) => renderInviteMail({ ...custom, logo: { ...custom.logo, w, h } }, { ...CTX, logoUrl: LOGO }).html.match(/<img [^>]*width="(\d+)" height="(\d+)"[^>]*style="[^"]*width:(\d+)px;[^"]*height:(\d+)px/)!.slice(1).map(Number)
    expect(show(480, 192)).toEqual([240, 96, 240, 96]); expect(show(300, 100)).toEqual([240, 80, 240, 80]); expect(show(240, 80)).toEqual([240, 80, 240, 80]); expect(show(120, 40)).toEqual([120, 40, 120, 40]); expect(show(480, 480)).toEqual([240, 240, 240, 240])
    expect(resolveInviteConfig({ logo: { mode: 'custom', file: custom.logo.file, w: 9999, h: 9999 } }).logo).toMatchObject({ w: 480, h: 480 })   // Maße aus beschädigter Zeile werden begrenzt
  })
  it('nur Logo-Adressen auf unserem Bucket (PNG/JPG, ohne Parameter): fremde Hosts, SVG, GIF, WebP, Query und javascript: ergeben kein Bild', () => {
    for (const bad of ['https://evil.de/logo.png', 'https://plexora-files.s3.eu-central-1.amazonaws.com/mail-logos/a/b.svg', 'https://plexora-files.s3.eu-central-1.amazonaws.com/mail-logos/a/b.gif', 'https://plexora-files.s3.eu-central-1.amazonaws.com/mail-logos/a/b.webp', 'https://plexora-files.s3.eu-central-1.amazonaws.com/mail-logos/a/b.png?x=1', 'https://plexora-files.s3.eu-central-1.amazonaws.com/lambda/code.png', 'https://plexora-files.s3.eu-central-1.amazonaws.com/mail-logos/../lambda/x.png', 'http://plexora-files.s3.eu-central-1.amazonaws.com/mail-logos/a/b.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA']) {
      expect(isLogoUrl(bad), bad).toBe(false); expect(renderInviteMail(custom, { ...CTX, logoUrl: bad }).html, bad).not.toContain('<img')
    }
    expect(isLogoUrl('https://plexora-files.s3.eu-central-1.amazonaws.com/branding/logo250x100.jpg')).toBe(true)
  })
  it('Logo-Datei und Maße kommen nie aus der Anfrage: die gespeicherte Datei bleibt, eine fremde wird ignoriert; "eigenes Logo" ohne Datei ist nicht möglich', () => {
    const stored = custom
    const req: any = clone(); req.logo = { ...req.logo, mode: 'custom', file: 'mail-logos/ffffffffffffffff/ffffffffffffffffffffffffffffffff.png', w: 1, h: 1 }
    const r = validateInviteConfig(req, stored); expect(r.ok).toBe(true); if (r.ok) expect(r.value.logo).toMatchObject({ file: custom.logo.file, w: 200, h: 80 })
    const none = validateInviteConfig(req, undefined); expect(none.ok).toBe(false); if (!none.ok) expect(none.field).toBe('logo.mode')
    expect(resolveInviteConfig({ logo: { mode: 'custom', file: '../../etc/passwd', w: 5, h: 5 } }).logo).toMatchObject({ mode: 'none', file: '' })
    expect(resolveInviteConfig({ logo: { mode: 'custom', file: 'mail-logos/zzzz/x.png' } }).logo.file).toBe('')
  })
  it('Ersatztext bei blockiertem Logo bleibt lesbar: auf heller Platte dunkle, auf dunkler Platte helle Schrift (nicht die Überschriftfarbe)', () => {
    const dark = applyPreset(DEFAULT_INVITE, 'dunkel')                                   // Überschrift ist weiß
    const onWhite = renderInviteMail({ ...dark, logo: { ...custom.logo, plate: true, plateColor: '#ffffff' } }, { ...CTX, logoUrl: LOGO }).html
    const onBlack = renderInviteMail({ ...dark, logo: { ...custom.logo, plate: true, plateColor: '#101010' } }, { ...CTX, logoUrl: LOGO }).html
    const altColor = (h: string) => h.match(/<img [^>]*color:(#[0-9a-f]{6})">/)![1]
    expect(altColor(onWhite)).toBe('#111827'); expect(altColor(onBlack)).toBe('#ffffff')
    expect(contrastRatio(altColor(onWhite), '#ffffff')).toBeGreaterThanOrEqual(4.5); expect(contrastRatio(altColor(onBlack), '#101010')).toBeGreaterThanOrEqual(4.5)
    const noPlate = renderInviteMail({ ...dark, logo: { ...custom.logo, plate: false } }, { ...CTX, logoUrl: LOGO }).html; expect(altColor(noPlate)).toBe(dark.colors.heading)
  })
  it('Branding-Logo ohne bekannte Maße: Breite fest, Höhe automatisch', () => {
    const c = { ...clone(), logo: { ...clone().logo, mode: 'branding' } }
    const m = renderInviteMail(c, { ...CTX, logoUrl: 'https://plexora-files.s3.eu-central-1.amazonaws.com/branding/logo250x100.jpg' }); expect(m.html).toMatch(/<img src="[^"]+" width="160" alt=/)
  })
})

describe('Kontrastwarnung', () => {
  it('warnt bei weniger als 4,5 : 1 (Text auf Hintergrund, Button-Schrift auf Button) und blockiert das Speichern nicht', () => {
    const c = clone(); c.colors.text = '#cccccc'; c.colors.buttonText = '#ffffff'; c.colors.button = '#62a0ea'
    const w = contrastWarnings(c); expect(w.map(x => x.key).sort()).toEqual(['button', 'text']); expect(w[0].message).toMatch(/schlecht lesbar/)
    expect(validateInviteConfig(c).ok).toBe(true)
  })
  it('gleiche Farbe ergibt 1 : 1, Schwarz auf Weiß 21 : 1', () => { expect(contrastRatio('#abcdef', '#abcdef')).toBeCloseTo(1, 5); expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0) })
})

describe('Prüfung beim Speichern: Form', () => {
  it('Müll als Ganzes (kein Objekt, Liste, Zahl) wird abgelehnt', () => { for (const x of [null, undefined, 'x', 5, [], true]) expect(validateInviteConfig(x as any).ok).toBe(false) })
  it('jede Fehlermeldung nennt das Feld', () => { const c = clone(); c.heading = 'siehe www.evil.de'; const r = validateInviteConfig(c); expect(r.ok).toBe(false); if (!r.ok) { expect(r.field).toBe('heading'); expect(r.error).toContain('Überschrift') } })
})
