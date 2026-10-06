import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Die Oberfläche muss dem Demo-Besucher die Servermeldung zeigen (403 bei Mailversand), nicht einen rohen Fehler.
const finance = readFileSync('app/pages/finance/index.vue', 'utf8')
const marketing = readFileSync('app/pages/marketing/index.vue', 'utf8')
const slice = (src: string, from: string, len = 900) => src.slice(src.indexOf(from), src.indexOf(from) + len)

describe('Finanz-Seite: verständliche Meldung bei abgelehntem Mailversand', () => {
  it('Hilfsfunktion nutzt die Servermeldung (e.data.message)', () => {
    expect(finance).toContain('function apiErrorMessage')
    expect(slice(finance, 'function apiErrorMessage', 200)).toContain('e?.data?.message')
  })
  it('Neuanlage, Senden-Knopf und Mahnung haben ein catch mit apiErrorMessage', () => {
    for (const fn of ['async function addInvoice', 'async function sendMail(', 'async function sendDunning']) {
      const body = slice(finance, fn, 1500)
      expect(body, fn).toContain('catch')
      expect(body, fn).toContain('apiErrorMessage(e')
    }
  })
  it('die rohe Meldung "e.message" wird bei Mahnung nicht mehr angezeigt', () => {
    expect(slice(finance, 'async function sendDunning', 900)).not.toContain("'Fehler: ' + e.message")
  })
  it('wurde die Rechnung gespeichert, aber nicht gesendet, wird das getrennt gemeldet', () => {
    expect(finance).toContain('Rechnung gespeichert, aber nicht gesendet')
  })
})

describe('Marketing-Seite', () => {
  it('Kampagnenversand zeigt die Servermeldung', () => {
    expect(slice(marketing, 'async function sendEmailBlast', 1400)).toContain('e?.data?.message')
  })
})
