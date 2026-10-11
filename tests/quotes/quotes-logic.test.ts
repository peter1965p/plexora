import { describe, it, expect } from 'vitest'
import { parseQuoteInput, QuoteError, totals, canTransition, effectiveStatus, canRespond, quoteNumber, addDays, isIsoDate, QUOTE_STATUS, LIMITS } from '../../shared/quotes'

const NOW = Date.parse('2026-10-11T10:00:00Z')
const ok = (over: any = {}) => ({ client: 'Max Muster', clientEmail: 'Max@Firma.de', items: [{ description: 'Website Paket', qty: 1, price: 450 }], ...over })
const err = (b: any) => { try { parseQuoteInput(b, NOW); return null } catch (e: any) { return e instanceof QuoteError ? e.message : 'FALSCHER FEHLER: ' + e } }

describe('parseQuoteInput', () => {
  it('gültige Eingabe: bereinigt, E-Mail klein, Standard-Gültigkeit 14 Tage', () => {
    const q = parseQuoteInput(ok({ client: '  Max Muster\u0000 ', title: 'Aktion' }), NOW)
    expect(q).toMatchObject({ client: 'Max Muster', clientEmail: 'max@firma.de', title: 'Aktion', validUntil: '2026-10-25' }); expect(q.items).toEqual([{ description: 'Website Paket', qty: 1, price: 450 }])
  })
  it('Pflichtangaben', () => {
    expect(err(ok({ client: '' }))).toMatch(/Kunden/); expect(err(ok({ items: [] }))).toMatch(/Position/); expect(err(ok({ items: undefined }))).toMatch(/Position/); expect(err(null)).toMatch(/Kunden/)
    expect(err(ok({ items: [{ description: '', qty: 1, price: 1 }] }))).toMatch(/Position 1: Bitte eine Beschreibung/)
  })
  it('Zahlen: Menge > 0, Preis >= 0, keine NaN/Unendlich/Texte/riesige Werte; Rundung', () => {
    for (const bad of [{ qty: 0, price: 1 }, { qty: -1, price: 1 }, { qty: 1, price: -5 }, { qty: 'x', price: 1 }, { qty: 1, price: Infinity }, { qty: 1, price: NaN }, { qty: LIMITS.qtyMax + 1, price: 1 }, { qty: 1, price: LIMITS.priceMax + 1 }, { qty: null, price: 1 }])
      expect(err(ok({ items: [{ description: 'x', ...bad }] })), JSON.stringify(bad)).toMatch(/Menge ungültig|Preis ungültig/)
    expect(parseQuoteInput(ok({ items: [{ description: 'x', qty: '2', price: '10.005' }] }), NOW).items[0]).toEqual({ description: 'x', qty: 2, price: 10.01 })
  })
  it('E-Mail: ungültig oder mit mehreren Adressen/Kopfzeilen abgelehnt, leer erlaubt', () => {
    for (const e of ['kein-at', 'a@b', 'a@b.de, c@d.de', 'a@b.de\nBcc: x@y.de', '<a@b.de>']) expect(err(ok({ clientEmail: e })), e).toMatch(/E-Mail/)
    expect(err(ok({ clientEmail: '' }))).toBeNull()
  })
  it('Gültig bis: Datum wird geprüft, nicht in der Vergangenheit, heute erlaubt', () => {
    for (const d of ['2026-13-01', '2026-02-30', 'morgen', 20261111, '2026-10-11T00:00']) expect(err(ok({ validUntil: d })), String(d)).toMatch(/Datum/)
    expect(err(ok({ validUntil: '2026-10-10' }))).toMatch(/Vergangenheit/); expect(err(ok({ validUntil: '2026-10-11' }))).toBeNull()
  })
  it('Grenzen: zu viele Positionen, zu lange Texte werden gekürzt', () => {
    expect(err(ok({ items: Array.from({ length: LIMITS.items + 1 }, () => ({ description: 'x', qty: 1, price: 1 })) }))).toMatch(/Höchstens/)
    expect(parseQuoteInput(ok({ intro: 'a'.repeat(5000) }), NOW).intro.length).toBe(LIMITS.intro)
  })
  it('Nicht-Strings in Textfeldern werden zu leer, nicht zu "[object Object]"', () => { expect(parseQuoteInput(ok({ title: { a: 1 }, note: 5 }), NOW)).toMatchObject({ title: '', note: '' }) })
})

describe('Summen', () => {
  it('19 %, Kleinunternehmer, Rundung', () => {
    expect(totals([{ description: 'a', qty: 1, price: 450 }])).toEqual({ net: 450, vat: 85.5, gross: 535.5 })
    expect(totals([{ description: 'a', qty: 1, price: 450 }], 19, true)).toEqual({ net: 450, vat: 0, gross: 450 })
    expect(totals([{ description: 'a', qty: 3, price: 0.1 }, { description: 'b', qty: 1, price: 0.2 }])).toEqual({ net: 0.5, vat: 0.1, gross: 0.6 })
    expect(totals([], 19)).toEqual({ net: 0, vat: 0, gross: 0 })
  })
})

describe('Status', () => {
  it('erlaubte Wechsel; abgeschlossene Zustände sind endgültig', () => {
    expect(canTransition('draft', 'sent')).toBe(true); expect(canTransition('sent', 'accepted')).toBe(true); expect(canTransition('sent', 'declined')).toBe(true); expect(canTransition('expired', 'sent')).toBe(true)
    for (const [a, b] of [['draft', 'accepted'], ['draft', 'declined'], ['accepted', 'declined'], ['accepted', 'sent'], ['declined', 'accepted'], ['declined', 'sent'], ['sent', 'draft'], ['sent', 'sent']] as const) expect(canTransition(a, b), `${a}->${b}`).toBe(false)
    expect(canTransition('x' as any, 'sent')).toBe(false); expect(QUOTE_STATUS).toHaveLength(5)
  })
  it('abgelaufen: gesendet + Datum vorbei = abgelaufen; Entwurf/angenommen bleiben; am Gültigkeitstag noch offen', () => {
    expect(effectiveStatus({ status: 'sent', validUntil: '2026-10-10' }, NOW)).toBe('expired'); expect(effectiveStatus({ status: 'sent', validUntil: '2026-10-11' }, NOW)).toBe('sent')
    expect(effectiveStatus({ status: 'draft', validUntil: '2020-01-01' }, NOW)).toBe('draft'); expect(effectiveStatus({ status: 'accepted', validUntil: '2020-01-01' }, NOW)).toBe('accepted')
  })
  it('der Kunde kann nur ein gesendetes, gültiges Angebot beantworten', () => {
    expect(canRespond({ status: 'sent', validUntil: '2026-10-11' }, NOW)).toBe(true); expect(canRespond({ status: 'sent', validUntil: '2026-10-10' }, NOW)).toBe(false)
    for (const s of ['draft', 'accepted', 'declined', 'expired'] as const) expect(canRespond({ status: s, validUntil: '2099-01-01' }, NOW)).toBe(false)
  })
})

describe('Hilfen', () => {
  it('Nummer, Datum', () => { expect(quoteNumber(2026, 7)).toBe('AN-2026-007'); expect(quoteNumber(2026, 1234)).toBe('AN-2026-1234'); expect(addDays('2026-12-25', 10)).toBe('2027-01-04'); expect(isIsoDate('2024-02-29')).toBe(true); expect(isIsoDate('2026-02-29')).toBe(false) })
})
