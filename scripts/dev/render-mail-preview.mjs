#!/usr/bin/env node
// Erzeugt die Einladungsmail für alle Stilvorlagen und Sonderfälle als HTML-Dateien und rendert sie mit Firefox (headless) zu Bildern:
//   hell | dunkel (echte Systemeinstellung prefers-color-scheme: dark) | invertiert (wie automatische Abdunkelung mancher Mail-Programme) | Handy-Breite
// Nutzung: node scripts/dev/render-mail-preview.mjs [Ausgabeordner]   (Standard: /tmp/plexora-mail-preview). Nur zum Prüfen der Darstellung, ändert nichts.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { DEFAULT_INVITE, STYLE_PRESETS, applyPreset, renderInviteMail, SAMPLE_CTX, logoUrlForFile } from '../../shared/mailTemplate.ts'

const out = process.argv[2] || '/tmp/plexora-mail-preview'
mkdirSync(out, { recursive: true })
const profile = join(out, 'ff-profile'); mkdirSync(profile, { recursive: true })
const prof = (dark) => { const d = join(profile, dark ? 'dark' : 'light'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, 'user.js'), `user_pref("layout.css.prefers-color-scheme.content-override", ${dark ? 0 : 1});\nuser_pref("browser.shell.checkDefaultBrowser", false);\n`); return d }
const ctx = { ...SAMPLE_CTX, inviterName: 'Maria Beispiel', inviterEmail: 'maria@beispiel-firma.de', inviteeEmail: 'neu@beispiel-firma.de', expiresAt: new Date('2026-10-14T12:00:00Z'), acceptUrl: 'https://app.plexora.eu/invite?token=3f2b6c1e-8a4d-4e0b-9d1c-7a5b2f9e0c11' }
const LOGO = 'https://plexora-files.s3.eu-central-1.amazonaws.com/mail-logos/0123456789abcdef/0123456789abcdef0123456789abcdef.png'
const customLogo = { mode: 'custom', alt: 'Beispiel Firma', align: 'left', plate: true, plateColor: '#ffffff', file: 'mail-logos/0123456789abcdef/0123456789abcdef0123456789abcdef.png', w: 480, h: 160 }

const scenarios = {}
for (const k of Object.keys(STYLE_PRESETS)) scenarios[`stil-${k}`] = { cfg: applyPreset(DEFAULT_INVITE, k), ctx }
scenarios['logo-platte-dunkel'] = { cfg: { ...applyPreset(DEFAULT_INVITE, 'dunkel'), logo: customLogo }, ctx: { ...ctx, logoUrl: LOGO } }
scenarios['logo-blockiert'] = { cfg: { ...applyPreset(DEFAULT_INVITE, 'hell'), logo: { ...customLogo, plate: false, alt: 'Beispiel Firma' } }, ctx: { ...ctx, logoUrl: 'https://plexora-files.s3.eu-central-1.amazonaws.com/mail-logos/ffffffffffffffff/ffffffffffffffffffffffffffffffff.png' } }
scenarios['schlechter-kontrast'] = { cfg: { ...DEFAULT_INVITE, colors: { ...DEFAULT_INVITE.colors, card: '#ffffff', text: '#ffffff', heading: '#ffffff', footer: '#ffffff', button: '#ffffff', buttonText: '#ffffff', buttonBorder: '#cccccc' }, button: { ...DEFAULT_INVITE.button, borderWidth: 2, width: 'full' } }, ctx }
scenarios['volle-breite-links'] = { cfg: { ...applyPreset(DEFAULT_INVITE, 'plexora-blau'), button: { ...DEFAULT_INVITE.button, width: 'full', align: 'left', radius: 24 }, layout: { cardWidth: 640, divider: true }, font: { ...DEFAULT_INVITE.font, family: 'mono', headingSize: 30 } }, ctx }

const ff = (args) => execFileSync('firefox', ['--headless', '--no-remote', ...args], { stdio: 'ignore', timeout: 60000 })
const files = []
for (const [name, s] of Object.entries(scenarios)) {
  const m = renderInviteMail(s.cfg, s.ctx)
  const html = join(out, `${name}.html`); writeFileSync(html, m.html); writeFileSync(join(out, `${name}.txt`), m.text)
  const wrap = join(out, `${name}-invertiert.html`)
  writeFileSync(wrap, `<!doctype html><body style="margin:0;background:#fff"><iframe src="file://${html}" style="width:100%;height:100vh;border:0;filter:invert(1) hue-rotate(180deg)"></iframe></body>`)
  for (const [variant, dark, width, file] of [['hell', false, 700, html], ['dunkel', true, 700, html], ['invertiert', false, 700, wrap], ['handy', false, 375, html]]) {
    const png = join(out, `${name}--${variant}.png`)
    try { ff(['-profile', prof(dark), '--screenshot', png, `--window-size=${width},980`, `file://${file}`]); files.push(png) } catch { console.error('Rendern fehlgeschlagen:', name, variant) }
  }
}
console.log(`${Object.keys(scenarios).length} Szenarien, ${files.length} Bilder in ${out}`)
if (!existsSync(files[0] || '')) process.exit(1)
