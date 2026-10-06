import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const seed = JSON.parse(readFileSync('scripts/demo/demo-seed.json', 'utf8'))
const rows: { t: string; r: any }[] = Object.entries<any[]>(seed.tables).flatMap(([t, rs]) => rs.map(r => ({ t, r })))
const text = JSON.stringify(seed)
const PK: Record<string, string> = { 'plexora-contacts': 'contactId', 'plexora-companies': 'companyId', 'plexora-deals': 'dealId', 'plexora-contracts': 'contractId', 'plexora-projects': 'projectId', 'plexora-support': 'ticketId', 'plexora-finance': 'invoiceId', 'plexora-forms': 'formId', 'plexora-marketing': 'campaignId', 'plexora-hr': 'employeeId', 'plexora-services': 'serviceId', 'plexora-articles': 'articleId', 'plexora-automations': 'automationId' }

describe('Demo-Seed: klar erfundene Daten', () => {
  it('alle Zeilen gehören dem Demo-Mandanten, feste IDs sind eindeutig', () => {
    for (const { t, r } of rows) expect(r.userId, t).toBe('demo@plexora.eu')
    const ids = rows.map(({ t, r }) => `${t}:${r[PK[t]]}`)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(i => !i.endsWith(':undefined'))).toBe(true)
    expect(Object.keys(PK).sort()).toEqual(Object.keys(seed.tables).sort())
  })
  it('E-Mail-Adressen nur auf example.com, .test oder .invalid', () => {
    const emails = text.replaceAll(seed.owner, 'OWNER').match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+/g) || []
    expect(emails.length).toBeGreaterThan(20)
    for (const e of emails) expect(/@([a-z0-9-]+\.)*example\.(com|org)$|\.(test|invalid)$/i.test(e), e).toBe(true)
  })
  it('Telefonnummern nur im Beispielbereich der Bundesnetzagentur (030 23125, 0221 4710)', () => {
    const phones = rows.map(({ r }) => r.phone).filter(Boolean)
    expect(phones.length).toBeGreaterThan(10)
    for (const p of phones) expect(/^\+49 (30 23125|221 4710) \d{3}$/.test(p), p).toBe(true)
  })
  it('Rechnungsnummern eindeutig, keine echten Firmen, keine Testreste', () => {
    const nums = seed.tables['plexora-finance'].map((r: any) => r.number)
    expect(new Set(nums).size).toBe(nums.length)
    for (const bad of ['SAP', 'Bosch', 'Telekom', 'Siemens', 'Cloudflare', 'Hoffmann', 'Weber', 'Müller', 'Bauer', 'Klein', 'Schulz', 'Fischer', 'Päffgen', 'Sylvia', 'Meurer', 'Test GmbH', 'Abc', 'Tet'])
      expect(text, bad).not.toContain(bad)
  })
  it('Firmen und Personen tragen die vereinbarten erfundenen Namen', () => {
    const names = seed.tables['plexora-companies'].map((r: any) => r.name)
    expect(names).toEqual(['Musterfirma GmbH', 'Beispiel AG', 'Demo Handels KG'])
    expect(text).toContain('Max Mustermann'); expect(text).toContain('Erika Beispiel')
  })
  it('deckt Kontakte, Firmen, Deals, Verträge, Projekte, Support, Finanzen und Marketing ab', () => {
    for (const t of ['contacts', 'companies', 'deals', 'contracts', 'projects', 'support', 'finance', 'marketing']) expect(seed.tables[`plexora-${t}`].length, t).toBeGreaterThan(0)
  })
  it('Kampagne zeigt keine Bilder echter Kunden (keine Bild-URLs im Seed)', () => {
    expect(text).not.toMatch(/https?:\/\/[^"]*\.(png|jpe?g|webp|svg)/i)
    expect(text).not.toMatch(/amazonaws|plexora-files/)
  })
})
