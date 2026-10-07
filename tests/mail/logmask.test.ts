import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { maskLogText, logPreview } from '../../shared/logMask'
import { maskLogText as scriptMask } from '../../scripts/security/mask-mail-log.mjs'
import { installMocks, st, reset } from './helpers'

const SAMPLES = [
  'Hallo, hier der Link https://app.plexora.eu/invite?token=11111111-2222-4333-8444-555555555555 bitte klicken',
  'Beitreten: https://meet.google.com/aef-payw-zsr oder www.beispiel.de/pfad?x=1&y=2',
  'Token abc123DEF456ghi789JKL012mno345PQR und 11111111-2222-4333-8444-555555555555 sowie nichts Besonderes',
  'Ganz normaler Text ohne Link, mit Zahlen 12345 und Datum 07.10.2026.',
  'Mehrere: https://a.example/x/y/z?t=1 und http://b.example:8080/q#frag.', '',
]
describe('Protokoll-Maskierung', () => {
  it('Links werden auf den Host gekürzt, UUIDs und lange Zufallswerte ersetzt; normaler Text bleibt', () => {
    expect(maskLogText(SAMPLES[0])).toBe('Hallo, hier der Link https://app.plexora.eu/… bitte klicken')
    expect(maskLogText(SAMPLES[1])).toBe('Beitreten: https://meet.google.com/… oder https://www.beispiel.de/…')
    expect(maskLogText(SAMPLES[2])).toBe('Token […] und […] sowie nichts Besonderes')
    expect(maskLogText(SAMPLES[3])).toBe(SAMPLES[3]); expect(maskLogText(SAMPLES[4])).toBe('Mehrere: https://a.example/… und http://b.example:8080/….')
    for (const s of SAMPLES) expect(maskLogText(s), s).not.toMatch(/token=|11111111-2222|aef-payw|abc123DEF|pfad\?|x=1/)
  })
  it('Einladungen: keine Vorschau; sonst Text ohne Tags, maskiert und auf 600 Zeichen begrenzt', () => {
    expect(logPreview('team_invite', '<p>https://app.plexora.eu/invite?token=abc</p> Hallo')).toBe('')
    expect(logPreview('booking_confirmation', '<a href="https://meet.google.com/aef-payw-zsr">Beitreten</a> https://meet.google.com/aef-payw-zsr')).toBe('Beitreten https://meet.google.com/…')
    expect(logPreview('automation', 'a'.repeat(900)).length).toBe(600)
  })
  it('das Bereinigungsskript arbeitet exakt wie die Server-Logik (gleiche Ergebnisse für alle Beispiele)', () => {
    for (const s of SAMPLES) expect(scriptMask(s), s).toBe(maskLogText(s))
  })
  it('das Skript ist standardmäßig ein Probelauf, schreibt nur mit --apply und nur nach einem Export, legt nie Einträge an', () => {
    const src = readFileSync('scripts/security/mask-mail-log.mjs', 'utf8')
    expect(src).toContain("const apply = args.includes('--apply')"); expect(src).toMatch(/if \(!apply\) \{[^}]*return/); expect(src.indexOf('writeFileSync(file')).toBeLessThan(src.indexOf('new UpdateCommand'))
    expect(src).toContain("ConditionExpression: 'attribute_exists(mailId)'"); expect(src).not.toMatch(/PutCommand|DeleteCommand/)
  })
})

describe('Der zentrale Versand protokolliert maskiert (alle Mailarten)', () => {
  let sendMail: any
  beforeAll(async () => { installMocks(); sendMail = (await import('../../server/utils/mailer')).sendMail })
  it('Terminbestätigung mit Meet-Link: im Protokoll nur der Host; Einladung: gar keine Vorschau', async () => {
    reset()
    await sendMail({ userId: 'chef-a@firma.de', kind: 'booking_confirmation', from: 'x@plexora.eu', to: 'k@x.de', subject: 'Termin', html: '<p>Hier: https://meet.google.com/aef-payw-zsr</p>' })
    await sendMail({ userId: 'chef-a@firma.de', kind: 'team_invite', from: 'x@plexora.eu', to: 'k@x.de', subject: 'Einladung', html: '<a href="https://app.plexora.eu/invite?token=abc">x</a>', text: 'Link: https://app.plexora.eu/invite?token=abcdefgh' })
    expect(st.logs[0].preview).toBe('Hier: https://meet.google.com/…'); expect(st.logs[1].preview).toBe(''); expect(JSON.stringify(st.logs)).not.toMatch(/aef-payw|token=/)
  })
})
