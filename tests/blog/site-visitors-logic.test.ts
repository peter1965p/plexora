import { describe, it, expect } from 'vitest'
import { parseRegistration, parseCommentText, parseCommentsMode, checkPassword, normalizeEmail, cleanLine, VisitorError } from '../../shared/siteVisitors'

const ok = { name: 'Anna Muster', email: ' Anna@Beispiel.DE ', password: 'Sehr-sicheres-Geheimnis-7' }
describe('Registrierung', () => {
  it('bereinigt Name und E-Mail, lässt das Passwort unverändert', () => {
    const r = parseRegistration({ ...ok, password: '  Leerzeichen innen & außen!  ' })
    expect(r).toMatchObject({ name: 'Anna Muster', email: 'anna@beispiel.de', password: '  Leerzeichen innen & außen!  ' })
    expect(cleanLine('  A‮B\u0000  C ', 20)).toBe('AB C')
  })
  it('lehnt schlechte Eingaben mit verständlicher Meldung ab', () => {
    const bad = (o: any, re: RegExp) => expect(() => parseRegistration({ ...ok, ...o }), JSON.stringify(o)).toThrow(re)
    bad({ name: 'A' }, /Namen/); bad({ name: '' }, /Namen/); bad({ email: 'kaputt' }, /E-Mail/); bad({ email: 'a@b' }, /E-Mail/); bad({ email: 'a b@c.de' }, /E-Mail/)
    bad({ password: 'kurz' }, /mindestens 10/); bad({ password: 'x'.repeat(200) }, /höchstens 128/); bad({ password: 'aaaaaaaaaaaa' }, /zu einfach/)
    bad({ password: 'MeinPasswort123' }, /erraten/); bad({ name: 'Annabelle Z', password: 'xxAnna@Beispiel' }, /enthalten/)
    expect(() => parseRegistration(null)).toThrow(VisitorError); expect(() => parseRegistration({ ...ok, password: 12345678901 })).toThrow(/mindestens 10/)
  })
  it('E-Mail-Adressen werden klein geschrieben und beschnitten', () => { expect(normalizeEmail('  X@Y.De ')).toBe('x@y.de'); expect(normalizeEmail(5)).toBe('') })
  it('checkPassword einzeln', () => { expect(() => checkPassword('Ein-gutes-Geheimnis-42')).not.toThrow() })
})
describe('Kommentartext', () => {
  it('Klartext, Zeilenumbrüche bleiben, Steuerzeichen und Textumkehr fliegen raus', () => {
    expect(parseCommentText('  Hallo\r\nWelt\n\n\n\nEnde‮  ')).toBe('Hallo\nWelt\n\nEnde')
    expect(parseCommentText('<b>fett</b> & <script>x</script>')).toBe('<b>fett</b> & <script>x</script>')    // bleibt Text; die Oberfläche zeigt ihn nur als Text
  })
  it('Länge und Linkgrenze', () => {
    expect(() => parseCommentText('x')).toThrow(/zu kurz/); expect(() => parseCommentText('x'.repeat(2001))).toThrow(/zu lang/); expect(() => parseCommentText(undefined)).toThrow(/zu kurz/)
    expect(() => parseCommentText('Schau https://a.de und www.b.de und http://c.de')).toThrow(/Höchstens 2 Links/)
    expect(parseCommentText('Siehe https://a.de und www.b.de')).toContain('a.de')
  })
})
describe('Kommentar-Modus', () => { it('Standard ist aus; nur bekannte Werte', () => { expect(parseCommentsMode(undefined)).toBe('off'); expect(parseCommentsMode('x')).toBe('off'); expect(parseCommentsMode('open')).toBe('open'); expect(parseCommentsMode('moderated')).toBe('moderated') }) })
